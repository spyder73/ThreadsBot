import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
import uuid

@dataclass
class Account:
    id: str
    username: str
    platforms: List[str]
    context_file: Optional[str] = None
    created_at: Optional[str] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()

@dataclass
class GeneratedContent:
    id: str
    account_id: str
    content_type: str  # 'title', 'caption', 'text'
    content: str
    metadata: Dict  # stores platform, style, tone, etc.
    created_at: Optional[str] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()

@dataclass
class ScheduledPost:
    id: str
    account_id: str
    content: str
    platforms: List[str]
    scheduled_date: str
    content_id: Optional[str] = None  # Link to generated content
    status: str = "scheduled"
    created_at: Optional[str] = None
    uploaded_at: Optional[str] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()
            
@dataclass
class MediaFile:
    id: str
    account_id: str
    filename: str
    file_path: str
    file_type: str
    description: str
    file_size: int
    created_at: Optional[str] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()

class Database:
    def __init__(self, db_path: str = "scheduler.db"):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS accounts (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    platforms TEXT NOT NULL,
                    context_file TEXT,
                    created_at TEXT NOT NULL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS generated_content (
                    id TEXT PRIMARY KEY,
                    account_id TEXT NOT NULL,
                    content_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (account_id) REFERENCES accounts (id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS scheduled_posts (
                    id TEXT PRIMARY KEY,
                    account_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    platforms TEXT NOT NULL,
                    scheduled_date TEXT NOT NULL,
                    content_id TEXT,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    uploaded_at TEXT,
                    FOREIGN KEY (account_id) REFERENCES accounts (id),
                    FOREIGN KEY (content_id) REFERENCES generated_content (id)
                )
            """)
            conn.commit()
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS media_files (
                    id TEXT PRIMARY KEY,
                    account_id TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    description TEXT,
                    file_size INTEGER,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (account_id) REFERENCES accounts (id)
                )
            """)
            conn.commit()
    
    def create_account(self, username: str, platforms: List[str], context_file: Optional[str] = None) -> Account:
        account = Account(
            id=str(uuid.uuid4()),
            username=username,
            platforms=platforms,
            context_file=context_file
        )
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO accounts (id, username, platforms, context_file, created_at) VALUES (?, ?, ?, ?, ?)",
                (account.id, account.username, json.dumps(account.platforms), account.context_file, account.created_at)
            )
            conn.commit()
        
        return account
    
    def get_account(self, username: str) -> Optional[Account]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT * FROM accounts WHERE username = ?", (username,))
            row = cursor.fetchone()
            
            if row:
                return Account(
                    id=row[0],
                    username=row[1],
                    platforms=json.loads(row[2]),
                    context_file=row[3],
                    created_at=row[4]
                )
        return None
    
    def get_account_by_id(self, account_id: str) -> Optional[Account]:
        """Get account by ID"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT * FROM accounts WHERE id = ?", (account_id,))
            row = cursor.fetchone()
            
            if row:
                return Account(
                    id=row[0],
                    username=row[1],
                    platforms=json.loads(row[2]),
                    context_file=row[3],
                    created_at=row[4]
                )
        return None
    
    def get_all_accounts(self) -> List[Account]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT * FROM accounts")
            accounts = []
            for row in cursor.fetchall():
                accounts.append(Account(
                    id=row[0],
                    username=row[1],
                    platforms=json.loads(row[2]),
                    context_file=row[3],
                    created_at=row[4]
                ))
            return accounts
    
    def save_generated_content(self, account_id: str, content_type: str, content: str, metadata: Dict) -> GeneratedContent:
        generated_content = GeneratedContent(
            id=str(uuid.uuid4()),
            account_id=account_id,
            content_type=content_type,
            content=content,
            metadata=metadata
        )
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO generated_content (id, account_id, content_type, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (generated_content.id, generated_content.account_id, generated_content.content_type, 
                 generated_content.content, json.dumps(generated_content.metadata), generated_content.created_at)
            )
            conn.commit()
        
        return generated_content
    
    def get_generated_content(self, account_id: Optional[str] = None, content_type: Optional[str] = None) -> List[GeneratedContent]:
        with sqlite3.connect(self.db_path) as conn:
            query = "SELECT * FROM generated_content WHERE 1=1"
            params = []
            
            if account_id:
                query += " AND account_id = ?"
                params.append(account_id)
            
            if content_type:
                query += " AND content_type = ?"
                params.append(content_type)
            
            query += " ORDER BY created_at DESC"
            cursor = conn.execute(query, params)
            
            contents = []
            for row in cursor.fetchall():
                contents.append(GeneratedContent(
                    id=row[0],
                    account_id=row[1],
                    content_type=row[2],
                    content=row[3],
                    metadata=json.loads(row[4]),
                    created_at=row[5]
                ))
            
            return contents
    
    def create_scheduled_post(self, account_id: str, content: str, platforms: List[str], scheduled_date: str, content_id: Optional[str] = None) -> ScheduledPost:
        post = ScheduledPost(
            id=str(uuid.uuid4()),
            account_id=account_id,
            content=content,
            platforms=platforms,
            scheduled_date=scheduled_date,
            content_id=content_id
        )
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO scheduled_posts (id, account_id, content, platforms, scheduled_date, content_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (post.id, post.account_id, post.content, json.dumps(post.platforms), post.scheduled_date, post.content_id, post.status, post.created_at)
            )
            conn.commit()
        
        return post
    
    def get_scheduled_posts(self, account_id: Optional[str] = None) -> List[ScheduledPost]:
        with sqlite3.connect(self.db_path) as conn:
            if account_id:
                cursor = conn.execute("SELECT * FROM scheduled_posts WHERE account_id = ?", (account_id,))
            else:
                cursor = conn.execute("SELECT * FROM scheduled_posts")
            
            posts = []
            for row in cursor.fetchall():
                posts.append(ScheduledPost(
                    id=row[0],
                    account_id=row[1],
                    content=row[2],
                    platforms=json.loads(row[3]),
                    scheduled_date=row[4],
                    content_id=row[5],
                    status=row[6],
                    created_at=row[7],
                    uploaded_at=row[8]
                ))
            
            return posts
    
    def update_post_status(self, post_id: str, status: str, uploaded_at: Optional[str] = None):
        with sqlite3.connect(self.db_path) as conn:
            if uploaded_at:
                conn.execute(
                    "UPDATE scheduled_posts SET status = ?, uploaded_at = ? WHERE id = ?",
                    (status, uploaded_at, post_id)
                )
            else:
                conn.execute(
                    "UPDATE scheduled_posts SET status = ? WHERE id = ?",
                    (status, post_id)
                )
            conn.commit()
            
    # Add these methods to the Database class:
    def save_media_file(self, account_id: str, filename: str, file_path: str, 
                    file_type: str, description: str, file_size: int) -> MediaFile:
        media_file = MediaFile(
            id=str(uuid.uuid4()),
            account_id=account_id,
            filename=filename,
            file_path=file_path,
            file_type=file_type,
            description=description,
            file_size=file_size
        )
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO media_files (id, account_id, filename, file_path, file_type, description, file_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (media_file.id, media_file.account_id, media_file.filename, media_file.file_path, 
                media_file.file_type, media_file.description, media_file.file_size, media_file.created_at)
            )
            conn.commit()
        
        return media_file
    
    
    def get_media_files(self, account_id: Optional[str] = None, file_type: Optional[str] = None) -> List[MediaFile]:
        with sqlite3.connect(self.db_path) as conn:
            query = "SELECT * FROM media_files" 
            params = []
            if account_id:
                query += " WHERE account_id = ?"
                params.append(account_id)
            
            if file_type:
                query += " AND file_type = ?"
                params.append(file_type)
            
            query += " ORDER BY created_at DESC"
            cursor = conn.execute(query, params)
            
            files = []
            for row in cursor.fetchall():
                files.append(MediaFile(
                    id=row[0],
                    account_id=row[1],
                    filename=row[2],
                    file_path=row[3],
                    file_type=row[4],
                    description=row[5],
                    file_size=row[6],
                    created_at=row[7]
                ))
            
            return files
        
    def delete_media_file(self, file_id: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("DELETE FROM media_files WHERE id = ?", (file_id,))
            conn.commit()
            return cursor.rowcount > 0