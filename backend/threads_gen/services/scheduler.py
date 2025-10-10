import random
from datetime import datetime, timedelta
from typing import List, Optional
from models.database import Database, ScheduledPost
from services.context_manager import ContextManager
from services.content_generator import ContentGenerator

class SchedulerService:
    def __init__(self, db: Database, content_generator: ContentGenerator, context_manager: ContextManager):
        self.db = db
        self.content_generator = content_generator
        self.context_manager = context_manager
    
    def schedule_daily_posts(self, username: str, prompts: List[str], target_date: Optional[str] = None) -> List[ScheduledPost]:
        account = self.db.get_account(username)
        if not account:
            raise ValueError(f"Account {username} not found")
        
        if target_date is None:
            target_date = datetime.now().date().isoformat()
        
        if account.context_file is not None:
            context = self.context_manager.get_context(account.context_file)
            
        scheduled_posts = []
        
        for prompt in prompts[:3]:
            content = self.content_generator.generate_content(prompt, context)
            scheduled_time = self._generate_random_time(target_date)
            
            post = self.db.create_scheduled_post(
                account_id=account.id,
                content=content,
                platforms=account.platforms,
                scheduled_date=scheduled_time
            )
            scheduled_posts.append(post)
        
        return scheduled_posts
    
    def _generate_random_time(self, date_str: str) -> str:
        date = datetime.fromisoformat(date_str)
        
        hour = random.randint(8, 22)
        minute = random.randint(0, 59)
        
        scheduled_datetime = date.replace(hour=hour, minute=minute)
        return scheduled_datetime.isoformat()
    
    def get_posts_for_upload(self) -> List[ScheduledPost]:
        now = datetime.now().isoformat()
        all_posts = self.db.get_scheduled_posts()
        
        return [
            post for post in all_posts 
            if post.status == "scheduled" and post.scheduled_date <= now
        ]