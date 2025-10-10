import time
import threading
import requests
import json
from datetime import datetime
from typing import List
from models.database import Database, ScheduledPost


class PostExecutor:
    def __init__(self, db: Database, upload_base_url: str = "http://localhost:8000"):
        self.db = db
        self.upload_base_url = upload_base_url
        self.is_running = False
        self.executor_thread = None
        self.check_interval = 60  # Check every minute
        
    def start_executor(self):
        """Start the background post executor"""
        if self.is_running:
            return
            
        self.is_running = True
        self.executor_thread = threading.Thread(target=self._executor_loop, daemon=True)
        self.executor_thread.start()
        print("Post executor started")
        
    def stop_executor(self):
        """Stop the background post executor"""
        self.is_running = False
        if self.executor_thread:
            self.executor_thread.join(timeout=10)
        print("Post executor stopped")
        
    def _executor_loop(self):
        """Main executor loop"""
        while self.is_running:
            try:
                self._check_and_execute_posts()
            except Exception as e:
                print(f"Executor loop error: {e}")
                
            time.sleep(self.check_interval)
            
    def _check_and_execute_posts(self):
        """Check for posts ready to be executed and execute them"""
        # Get posts that are due for posting
        due_posts = self._get_due_posts()
        
        for post in due_posts:
            try:
                # Mark as processing
                self._update_post_status(post.id, 'processing')
                
                # Execute the post
                success = self._execute_post(post)
                
                # Update status based on result
                if success:
                    self._update_post_status(post.id, 'uploaded')
                    print(f"Successfully posted: {post.id}")
                else:
                    self._update_post_status(post.id, 'failed')
                    print(f"Failed to post: {post.id}")
                    
            except Exception as e:
                self._update_post_status(post.id, 'failed')
                print(f"Error executing post {post.id}: {e}")
                
    def _get_due_posts(self) -> List[ScheduledPost]:
        """Get posts that are due for posting"""
        import sqlite3
        
        due_posts = []
        current_time = datetime.now().isoformat()
        
        with sqlite3.connect(self.db.db_path) as conn:
            cursor = conn.execute(
                "SELECT * FROM scheduled_posts WHERE scheduled_date <= ? AND status = 'scheduled'",
                (current_time,)
            )
            
            for row in cursor.fetchall():
                # Debug: Print the row structure
                print(f"Row data: {row}")
                print(f"Row length: {len(row)}")
                
                # Convert row to ScheduledPost object
                # Database columns: id, account_id, content, platforms, scheduled_date, content_id, status, created_at, uploaded_at
                post = ScheduledPost(
                    id=row[0],
                    account_id=row[1], 
                    content=row[2],
                    platforms=json.loads(row[3]),  # Parse JSON string to list
                    scheduled_date=row[4],
                    content_id=row[5],  # This is content_id
                    status=row[6],      # This is status
                    created_at=row[7],  # This is created_at
                    uploaded_at=row[8] if len(row) > 8 and row[8] else None  # This is uploaded_at
                )
                due_posts.append(post)
                
        return due_posts
        
    def _execute_post(self, post: ScheduledPost) -> bool:
        """Execute a single post by calling the appropriate upload endpoint"""
        try:
            # Get account info
            account = self.db.get_account_by_id(post.account_id)
            if not account:
                print(f"Account not found for post {post.id} (account_id: {post.account_id})")
                # Let's also check what accounts exist
                all_accounts = self.db.get_all_accounts()
                print(f"Available accounts: {[(acc.id, acc.username) for acc in all_accounts]}")
                return False
            
            print(f"Found account: {account.username} for post {post.id}")
            
            # Platforms are already parsed in _get_due_posts
            platforms = post.platforms
            
            # Check if post has media
            media_files = self._get_post_media(post.id)
            
            if media_files['videos']:
                # Video post
                return self._upload_video_post(post, account, platforms, media_files['videos'])
            elif media_files['images']:
                # Photo post  
                return self._upload_photo_post(post, account, platforms, media_files['images'])
            else:
                # Text only post
                return self._upload_text_post(post, account, platforms)
                
        except Exception as e:
            print(f"Error executing post {post.id}: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _get_post_media(self, post_id: str) -> dict:
        """Get media files associated with a post"""
        # This would need to be implemented based on how you link posts to media
        # For now, return empty (text-only posts)
        return {'images': [], 'videos': []}
    
    def _upload_text_post(self, post, account, platforms) -> bool:
        """Upload a text-only post"""
        try:
            payload = {
                'title': post.content,
                'user': account.username,
                'platforms': platforms
            }
            
            print(f"Uploading text post: {payload}")
            
            response = requests.post(
                f"{self.upload_base_url}/schedule-text",
                json=payload,
                timeout=30
            )
            
            print(f"Upload response: {response.status_code}, {response.text}")
            
            return response.status_code == 200 and response.json().get('success', False)
            
        except Exception as e:
            print(f"Error uploading text post: {e}")
            return False
    
    def _upload_photo_post(self, post, account, platforms, photos) -> bool:
        """Upload a photo post"""
        try:
            payload = {
                'photos': [photo.file_path for photo in photos],
                'title': post.content,
                'user': account.username,
                'platforms': platforms
            }
            
            response = requests.post(
                f"{self.upload_base_url}/schedule-photo",
                json=payload,
                timeout=30
            )
            
            return response.status_code == 200 and response.json().get('success', False)
            
        except Exception as e:
            print(f"Error uploading photo post: {e}")
            return False
    
    def _upload_video_post(self, post, account, platforms, videos) -> bool:
        """Upload a video post"""
        try:
            payload = {
                'video_path': videos[0].file_path,  # First video
                'title': post.content,
                'user': account.username,
                'platforms': platforms
            }
            
            response = requests.post(
                f"{self.upload_base_url}/schedule-video",
                json=payload,
                timeout=30
            )
            
            return response.status_code == 200 and response.json().get('success', False)
            
        except Exception as e:
            print(f"Error uploading video post: {e}")
            return False
    
    def _update_post_status(self, post_id: str, status: str):
        """Update post status in database"""
        import sqlite3
        
        with sqlite3.connect(self.db.db_path) as conn:
            conn.execute(
                "UPDATE scheduled_posts SET status = ? WHERE id = ?",
                (status, post_id)
            )
            conn.commit()


# Global executor instance
executor = None


def get_executor():
    global executor
    if executor is None:
        from models.database import Database
        db = Database()
        executor = PostExecutor(db)
    return executor