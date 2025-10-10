import random
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from models.database import Database
from services.content_generator import ContentGenerator
from services.context_manager import ContextManager

class ContentGenerationService:
    def __init__(self, db: Database, content_generator: ContentGenerator, context_manager: ContextManager):
        self.db = db
        self.content_generator = content_generator
        self.context_manager = context_manager
    
    def generate_posts_for_days(self, account_username: str, days: int, settings: Dict) -> Dict:
        """Generate and schedule posts for the specified number of days"""
        try:
            # Get account
            account = self.db.get_account(account_username)
            if not account:
                return {'success': False, 'error': 'Account not found'}
            
            # Get media files for the account
            media_files = self.db.get_media_files(account.id)
            images = [f for f in media_files if f.file_type == 'image']
            videos = [f for f in media_files if f.file_type == 'video']
            
            # Load base context
            if account.context_file is not None:
                base_context = self.context_manager.get_context(account.context_file)
            else:
                print("No context file associated with account.")
                base_context = ""
            
            # Generate schedule
            schedule_times = self._generate_schedule(days, settings)
            
            # Generate content for each scheduled time
            created_posts = []
            for scheduled_time in schedule_times:
                try:
                    if base_context is not None:
                        post = self._generate_single_post(
                            account, base_context, images, videos, settings, scheduled_time
                        )
                        created_posts.append(post)
                    else:
                        print("No base context available; skipping post generation.")
                except Exception as e:
                    print(f"Failed to generate post for {scheduled_time}: {e}")
                    continue
            
            return {
                'success': True,
                'posts_created': len(created_posts),
                'posts': [post.__dict__ for post in created_posts]
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _generate_schedule(self, days: int, settings: Dict) -> List[datetime]:
        """Generate random schedule times within constraints"""
        schedule_times = []
        
        uploads_per_day = settings.get('uploads_per_day', 5)
        minimum_delay = settings.get('minimum_delay', 30)
        downtime_start = settings.get('downtime', {}).get('start', '22:00')
        downtime_end = settings.get('downtime', {}).get('end', '08:00')
        
        # Parse downtime hours
        downtime_start_hour = int(downtime_start.split(':')[0])
        downtime_start_min = int(downtime_start.split(':')[1])
        downtime_end_hour = int(downtime_end.split(':')[0])
        downtime_end_min = int(downtime_end.split(':')[1])
        
        current_time = datetime.now().replace(second=0, microsecond=0)
        
        for day in range(days):
            day_start = current_time.replace(hour=downtime_end_hour, minute=downtime_end_min) + timedelta(days=day)
            day_end = current_time.replace(hour=downtime_start_hour, minute=downtime_start_min) + timedelta(days=day)
            
            # Handle overnight downtime
            if downtime_end_hour > downtime_start_hour:
                day_end += timedelta(days=1)
            
            # Generate posts for this day
            posts_for_day = []
            last_post_time = None
            
            for post_num in range(uploads_per_day):
                if last_post_time is None:
                    # First post of the day - start after day_start
                    earliest_time = max(day_start, current_time + timedelta(minutes=5))
                else:
                    # Subsequent posts - respect minimum delay + random
                    earliest_time = last_post_time + timedelta(
                        minutes=minimum_delay + random.randint(0, 95)
                    )
                
                # Make sure we don't go past day_end
                if earliest_time >= day_end:
                    break
                
                # Add some randomness to the exact time
                random_offset = random.randint(0, 5)  # Up to 5 minutes random
                post_time = earliest_time + timedelta(minutes=random_offset)
                
                if post_time < day_end:
                    posts_for_day.append(post_time)
                    last_post_time = post_time
            
            schedule_times.extend(posts_for_day)
        
        return sorted(schedule_times)
    
    def _generate_single_post(self, account, base_context: str, images: List, videos: List, 
                            settings: Dict, scheduled_time: datetime) -> object:
        """Generate a single post with content and optional media"""
        
        # Determine media for this post
        selected_media = self._select_media_for_post(images, videos, settings)
        
        # Build enhanced context with media and additional prompt
        enhanced_context = self._build_enhanced_context(base_context, selected_media, settings)
        
        # Generate content using enhanced context
        generated_content = self.content_generator.generate_content(
            prompt="Create an engaging social media post.", 
            context=enhanced_context
        )
        
        # Create scheduled post
        scheduled_post = self.db.create_scheduled_post(
            account_id=account.id,
            content=generated_content,
            platforms=account.platforms,
            scheduled_date=scheduled_time.isoformat(),
            content_id=None
        )
        
        return scheduled_post
    
    def _select_media_for_post(self, images: List, videos: List, settings: Dict) -> Dict:
        """Randomly select media for a post based on settings"""
        max_images = settings.get('max_images_per_post', 1)
        max_videos = settings.get('max_videos_per_post', 1)
        
        selected_media = {
            'images': [],
            'videos': []
        }

        # Randomly select images
        if max_images > 0 and images:
            num_images = random.randint(0, min(max_images, len(images)))
            if num_images > 0:
                selected_media['images'] = random.sample(images, num_images)
        
        # Randomly select videos (but not if we already have images, for simplicity)
        if max_videos > 0 and videos and not selected_media['images']:
            num_videos = random.randint(0, min(max_videos, len(videos)))
            if num_videos > 0:
                selected_media['videos'] = random.sample(videos, num_videos)
        
        return selected_media
    
    def _build_enhanced_context(self, base_context: str, selected_media: Dict, settings: Dict) -> str:
        """Build enhanced context that includes base context + media descriptions + additional prompt"""
        enhanced_context = base_context if base_context else ""
        
        # Add media context if any media is selected
        if selected_media['images'] or selected_media['videos']:
            enhanced_context += "\n\nMedia available for this post:\n"
            
            if selected_media['images']:
                image_descriptions = []
                for img in selected_media['images']:
                    image_descriptions.append(f"- Image '{img.filename}': {img.description}")
                enhanced_context += "\nImages:\n" + "\n".join(image_descriptions)
            
            if selected_media['videos']:
                video_descriptions = []
                for vid in selected_media['videos']:
                    video_descriptions.append(f"- Video '{vid.filename}': {vid.description}")
                enhanced_context += "\nVideos:\n" + "\n".join(video_descriptions)
        
        # Add additional prompt from settings
        additional_prompt = settings.get('additional_prompt', '').strip()
        if additional_prompt:
            enhanced_context += f"\n\nAdditional instructions for this generation session:\n{additional_prompt}"
        
        return enhanced_context