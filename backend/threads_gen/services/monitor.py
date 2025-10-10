import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List
from models.database import Database
from services.generator import ContentGenerationService
from services.content_generator import ContentGenerator
from services.context_manager import ContextManager
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key from environment
openrouter_api_key = os.getenv('OPENROUTER_API_KEY')

if not openrouter_api_key:
    raise ValueError("OPENROUTER_API_KEY not found in environment variables")


class AutoGenerationMonitor:
    def __init__(self, db: Database):
        self.db = db
        self.context_manager = ContextManager()
        self.content_generator = ContentGenerator(
            api_key=str(openrouter_api_key)
        )
        self.generation_service = ContentGenerationService(
            self.db, self.content_generator, self.context_manager
        )
        self.is_running = False
        self.check_interval = 300  # Check every 5 minutes
        self.monitor_thread = None
        self.last_check = None
        self.generation_log = []
        
    def start_monitoring(self):
        """Start the background monitoring service"""
        if self.is_running:
            return
            
        self.is_running = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        print("Auto-generation monitor started")
        
    def stop_monitoring(self):
        """Stop the background monitoring service"""
        self.is_running = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=10)
        print("Auto-generation monitor stopped")
        
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.is_running:
            try:
                self.last_check = datetime.now()
                accounts_to_generate = self._check_accounts_need_generation()
                
                for account_data in accounts_to_generate:
                    try:
                        self._auto_generate_for_account(account_data)
                    except Exception as e:
                        self._log_error(account_data['account'].username, str(e))
                        
            except Exception as e:
                print(f"Monitor loop error: {e}")
                
            # Wait for next check
            time.sleep(self.check_interval)
            
    def _check_accounts_need_generation(self) -> List[Dict]:
        """Check which accounts need auto-generation"""
        accounts_needing_generation = []
        
        try:
            accounts = self.db.get_all_accounts()
            
            for account in accounts:
                # Get future scheduled posts for this account
                scheduled_posts = self.db.get_scheduled_posts(account.id)
                future_posts = [
                    post for post in scheduled_posts
                    if datetime.fromisoformat(post.scheduled_date) > datetime.now()
                    and post.status == 'scheduled'
                ]
                
                # Check if we need to generate more content
                if len(future_posts) <= 5:
                    # Get account's default settings (you might want to store these)
                    default_settings = self._get_account_default_settings(account)
                    
                    accounts_needing_generation.append({
                        'account': account,
                        'current_posts': len(future_posts),
                        'settings': default_settings
                    })
                    
        except Exception as e:
            print(f"Error checking accounts: {e}")
            
        return accounts_needing_generation
        
    def _get_account_default_settings(self, account) -> Dict:
        """Get default generation settings for an account"""
        # You could store these in the database or use sensible defaults
        return {
            'uploads_per_day': 3,  # Conservative default
            'minimum_delay': 60,
            'downtime': {'start': '22:00', 'end': '08:00'},
            'max_images_per_post': 1,
            'max_videos_per_post': 1,
            'additional_prompt': 'Auto-generated content to maintain posting schedule'
        }
        
    def _auto_generate_for_account(self, account_data):
        """Auto-generate content for a specific account"""
        account = account_data['account']
        settings = account_data['settings']
        
        print(f"Auto-generating content for {account.username} (currently {account_data['current_posts']} posts)")
        
        # Generate content for 2 days to bring the queue back up
        result = self.generation_service.generate_posts_for_days(
            account_username=account.username,
            days=2,
            settings=settings
        )
        
        if result['success']:
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'account': account.username,
                'action': 'auto_generation',
                'posts_created': result['posts_created'],
                'success': True
            }
            self.generation_log.append(log_entry)
            print(f"Auto-generated {result['posts_created']} posts for {account.username}")
        else:
            self._log_error(account.username, result.get('error', 'Unknown error'))
            
    def _log_error(self, account_username: str, error_message: str):
        """Log generation errors"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'account': account_username,
            'action': 'auto_generation',
            'error': error_message,
            'success': False
        }
        self.generation_log.append(log_entry)
        print(f"Auto-generation failed for {account_username}: {error_message}")
        
    def get_status(self) -> Dict:
        """Get current monitor status"""
        return {
            'is_running': self.is_running,
            'last_check': self.last_check.isoformat() if self.last_check else None,
            'check_interval': self.check_interval,
            'recent_logs': self.generation_log[-10:],  # Last 10 log entries
            'total_logs': len(self.generation_log)
        }
        
    def get_account_status(self) -> List[Dict]:
        """Get status for all accounts"""
        account_statuses = []
        
        try:
            accounts = self.db.get_all_accounts()
            
            for account in accounts:
                scheduled_posts = self.db.get_scheduled_posts(account.id)
                future_posts = [
                    post for post in scheduled_posts
                    if datetime.fromisoformat(post.scheduled_date) > datetime.now()
                    and post.status == 'scheduled'
                ]
                
                # Get next post time
                next_post = None
                if future_posts:
                    next_post = min(post.scheduled_date for post in future_posts)
                
                account_statuses.append({
                    'username': account.username,
                    'platforms': account.platforms,
                    'pending_posts': len(future_posts),
                    'next_post': next_post,
                    'needs_generation': len(future_posts) <= 5,
                    'context_file': account.context_file
                })
                
        except Exception as e:
            print(f"Error getting account status: {e}")
            
        return account_statuses

# Global monitor instance
monitor = None

def get_monitor():
    global monitor
    if monitor is None:
        from models.database import Database
        db = Database()
        monitor = AutoGenerationMonitor(db)
    return monitor