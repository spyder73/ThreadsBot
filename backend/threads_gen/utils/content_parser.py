from typing import Dict, List, Any

def parse_scraped_thread(scraped_data: Dict) -> Dict:
    """
    Parse scraped thread data to extract key information for context
    Returns: dict with main_thread, top_replies, and user_info
    """
    if not scraped_data or 'thread' not in scraped_data:
        return {'error': 'Invalid thread data'}
    
    thread = scraped_data['thread']
    replies = scraped_data.get('replies', [])
    
    # Parse main thread
    main_thread = {
        'text': thread.get('text', ''),
        'like_count': thread.get('like_count', 0),
        'reply_count': len(replies),  # Use actual reply count from scraped data
        'url': thread.get('url', ''),
        'published_on': thread.get('published_on', '')
    }
    
    # Parse user info from main thread
    user_info = {
        'username': thread.get('username', ''),
        'full_name': thread.get('username', ''),  # Thread data doesn't have full_name
        'verified': thread.get('user_verified', False)
    }
    
    # Sort replies by like count and get top 3
    sorted_replies = sorted(replies, key=lambda x: x.get('like_count', 0), reverse=True)
    top_replies = []
    
    for reply in sorted_replies[:3]:
        top_replies.append({
            'text': reply.get('text', ''),
            'like_count': reply.get('like_count', 0),
            'username': reply.get('username', ''),
            'verified': reply.get('user_verified', False)
        })
    
    return {
        'main_thread': main_thread,
        'top_replies': top_replies,
        'user_info': user_info
    }


def parse_scraped_profile(scraped_data: Dict) -> Dict:
    """
    Parse scraped profile data to extract key information for context
    Returns: dict with user_info and top_posts
    """
    if not scraped_data or 'user' not in scraped_data:
        return {'error': 'Invalid profile data'}
    
    user = scraped_data['user']
    threads = scraped_data.get('threads', [])
    
    # Parse user info
    user_info = {
        'username': user.get('username', ''),
        'full_name': user.get('full_name', ''),
        'bio': user.get('bio', ''),
        'followers': user.get('followers', 0),
        'verified': user.get('is_verified', False),
        'private': user.get('is_private', False)
    }
    
    # Sort threads by engagement (like_count + estimated reply engagement)
    # Since we don't have reply counts, we'll use like_count as primary metric
    sorted_threads = sorted(threads, key=lambda x: x.get('like_count', 0), reverse=True)
    
    # Get top 5 performing posts
    top_posts = []
    for thread in sorted_threads[:5]:
        top_posts.append({
            'text': thread.get('text', ''),
            'like_count': thread.get('like_count', 0),
            'url': thread.get('url', ''),
            'published_on': thread.get('published_on', ''),
            'has_images': bool(thread.get('images')),
            'has_videos': bool(thread.get('videos'))
        })
    
    return {
        'user_info': user_info,
        'top_posts': top_posts
    }


def format_content_for_context(parsed_profiles: List[Dict], parsed_threads: List[Dict]) -> List[str]:
    """
    Format parsed profile and thread data for inclusion in personality context
    """
    context_lines = []
    
    if parsed_profiles:
        context_lines.append("### ANALYZED PROFILES:")
        context_lines.append("")
        
        for profile_data in parsed_profiles:
            if 'error' in profile_data:
                context_lines.append(f"Profile analysis failed: {profile_data['error']}")
                continue
                
            user_info = profile_data.get('user_info', {})
            top_posts = profile_data.get('top_posts', [])
            
            context_lines.append(f"**Profile: @{user_info.get('username', 'Unknown')}**")
            context_lines.append(f"- Full Name: {user_info.get('full_name', 'N/A')}")
            context_lines.append(f"- Bio: {user_info.get('bio', 'N/A')}")
            context_lines.append(f"- Followers: {user_info.get('followers', 0):,}")
            context_lines.append(f"- Verified: {user_info.get('verified', False)}")
            context_lines.append("")
            
            if top_posts:
                context_lines.append(f"**Top {len(top_posts)} Performing Posts:**")
                for i, post in enumerate(top_posts, 1):
                    context_lines.append(f"  {i}. [{post.get('like_count', 0)} likes] {post.get('text', 'N/A')}")
                context_lines.append("")
        
    if parsed_threads:
        context_lines.append("### ANALYZED INDIVIDUAL THREADS:")
        context_lines.append("")
        context_lines.append("*Note: These represent the type of engagement and responses*")
        context_lines.append("*your content should aim to provoke, not the content style to emulate.*")
        context_lines.append("")
        
        for thread_data in parsed_threads:
            if 'error' in thread_data:
                context_lines.append(f"Thread analysis failed: {thread_data['error']}")
                continue
                
            main_thread = thread_data.get('main_thread', {})
            top_replies = thread_data.get('top_replies', [])
            user_info = thread_data.get('user_info', {})
            
            context_lines.append(f"**Thread by @{user_info.get('username', 'Unknown')}:**")
            context_lines.append(f"- Content: {main_thread.get('text', 'N/A')}")
            context_lines.append(f"- Performance: {main_thread.get('like_count', 0)} likes, {main_thread.get('reply_count', 0)} replies")
            context_lines.append("")
            
            if top_replies:
                context_lines.append("**Top Engagement-Driving Replies:**")
                for i, reply in enumerate(top_replies, 1):
                    context_lines.append(f"  {i}. [@{reply.get('username', 'Unknown')}] {reply.get('text', 'N/A')}")
                    context_lines.append(f"     └─ {reply.get('like_count', 0)} likes")
                context_lines.append("")
                
                context_lines.append("**Engagement Insights:**")
                context_lines.append("- These replies show the type of discussion your content could generate")
                context_lines.append("- Notice the tone, topics, and controversy levels that drive engagement")
                context_lines.append("- Consider how to craft content that naturally invites similar responses")
                context_lines.append("")
    
    return context_lines


def analyze_engagement_patterns(parsed_profiles: List[Dict], parsed_threads: List[Dict]) -> Dict:
    """
    Analyze engagement patterns from scraped content to provide insights
    """
    insights = {
        'high_performing_topics': [],
        'engagement_triggers': [],
        'content_formats': [],
        'tone_analysis': []
    }
    
    # Analyze top posts from profiles
    for profile_data in parsed_profiles:
        if 'error' in profile_data:
            continue
            
        top_posts = profile_data.get('top_posts', [])
        for post in top_posts[:3]:  # Analyze top 3 posts
            text = post.get('text', '').lower()
            like_count = post.get('like_count', 0)
            
            # Simple keyword extraction for topics
            if like_count > 50:  # High engagement threshold
                if any(word in text for word in ['ki', 'ai', 'künstlich', 'digital']):
                    insights['high_performing_topics'].append('AI/Technology')
                if any(word in text for word in ['politik', 'wahl', 'partei', 'demokratie']):
                    insights['high_performing_topics'].append('Politics')
                if any(word in text for word in ['wirtschaft', 'jobs', 'arbeitsplätze', 'industrie']):
                    insights['high_performing_topics'].append('Economy/Industry')
    
    # Analyze thread replies for engagement triggers
    for thread_data in parsed_threads:
        if 'error' in thread_data:
            continue
            
        top_replies = thread_data.get('top_replies', [])
        for reply in top_replies:
            text = reply.get('text', '').lower()
            
            # Identify engagement patterns
            if '?' in text:
                insights['engagement_triggers'].append('Questions')
            if any(word in text for word in ['aber', 'jedoch', 'trotzdem']):
                insights['engagement_triggers'].append('Counterarguments')
            if len(text) < 50:
                insights['content_formats'].append('Short responses')
            if '!' in text:
                insights['tone_analysis'].append('Exclamatory/Emotional')
    
    # Remove duplicates
    for key in insights:
        insights[key] = list(set(insights[key]))
    
    return insights