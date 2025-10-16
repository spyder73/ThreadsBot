from flask import Blueprint, request, jsonify, send_file
from datetime import datetime
import os
import re
import asyncio
import glob
from threads_scraper.scrapeprofile import scrape_profile
from threads_scraper.scrapethread import scrape_thread
from utils.content_parser import parse_scraped_profile, parse_scraped_thread, format_content_for_context, analyze_engagement_patterns

personality_bp = Blueprint('personality', __name__)

def parse_threads_links(links_text):
    """
    Parse threads/instagram links and categorize them as profiles or threads
    Returns: dict with 'profiles' and 'threads' arrays
    """
    if not links_text:
        return {'profiles': [], 'threads': []}
    
    # Split by newlines and clean up
    lines = [line.strip() for line in links_text.split('\n') if line.strip()]
    
    profiles = []
    threads = []
    
    # Profile: https://www.threads.com/@username
    profile_pattern = r'https?://(?:www\.)?threads\.com/@([a-zA-Z0-9._]+)/?$'
    
    # Thread: https://www.threads.com/@username/post/POST_ID
    thread_pattern = r'https?://(?:www\.)?threads\.com/@([a-zA-Z0-9._]+)/post/([a-zA-Z0-9_-]+)'

    
    for link in lines:
        # Check for thread post first (more specific)
        thread_match = re.match(thread_pattern, link)
        if thread_match:
            threads.append({
                'url': link,
                'username': thread_match.group(1),
                'post_id': thread_match.group(2),
                'platform': 'threads'
            })
            continue
        
        # Check for profile
        profile_match = re.match(profile_pattern, link)
        if profile_match:
            profiles.append({
                'url': link,
                'username': profile_match.group(1),
                'platform': 'threads'
            })
            continue
    
    return {
        'profiles': profiles,
        'threads': threads
    }


async def scrape_all_links(threads_data):
    """Scrape all profiles and threads concurrently"""
    tasks = []
    
    # Create tasks for profiles
    for profile in threads_data['profiles']:
        tasks.append(scrape_profile(profile['url']))
    
    # Create tasks for threads
    for thread in threads_data['threads']:
        tasks.append(scrape_thread(thread['url']))
    
    # Run all tasks concurrently
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Assign results back
    profile_count = len(threads_data['profiles'])
    for i, profile in enumerate(threads_data['profiles']):
        if i < len(results):
            scraped_data = results[i]
            profile['scraped_data'] = scraped_data
            profile['parsed_data'] = parse_scraped_profile(scraped_data)
        else:
            profile['scraped_data'] = None
            error_msg = str(results[i]) if i < len(results) and isinstance(results[i], Exception) else 'Unknown error'
            profile['parsed_data'] = {'error': error_msg}
    
    for i, thread in enumerate(threads_data['threads']):
        result_idx = profile_count + i
        if result_idx < len(results):
            scraped_data = results[result_idx]
            thread['scraped_data'] = scraped_data
            thread['parsed_data'] = parse_scraped_thread(scraped_data)
        else:
            thread['scraped_data'] = None
            error_msg = str(results[result_idx]) if result_idx < len(results) and isinstance(results[result_idx], Exception) else 'Unknown error'
            thread['parsed_data'] = {'error': error_msg}
    
    return threads_data


@personality_bp.route('/create', methods=['POST'])
def create_personality():
    """Create a personality context file from form data"""
    try:
        data = request.json
        
        # Parse threads links
        threads_data = parse_threads_links(data.get('threads_links', ''))
        
        # Scrape profiles and threads if any exist
        if threads_data['profiles'] or threads_data['threads']:
            threads_data = asyncio.run(scrape_all_links(threads_data))
        
        # Generate filename from name or timestamp
        name = data.get('name', 'unnamed').lower().replace(' ', '_')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{name}_{timestamp}.txt"
        
        # Build context content
        context_lines = []
        context_lines.append(f"# AI Personality Context: {data.get('name', 'Unnamed')}")
        context_lines.append(f"# Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        context_lines.append("\n" + "="*80 + "\n")
        
        # Basic Identity
        context_lines.append("## BASIC IDENTITY\n")
        context_lines.append(f"Name: {data.get('name', 'N/A')}")
        context_lines.append(f"Age: {data.get('age', 'N/A')}")
        context_lines.append(f"Location: {data.get('location', 'N/A')}")
        context_lines.append(f"Occupation: {data.get('occupation', 'N/A')}")
        context_lines.append(f"Background: {data.get('background', 'N/A')}\n")
        
        # Personality Traits
        context_lines.append("## PERSONALITY TRAITS\n")
        context_lines.append(f"Personality Type: {data.get('personality_type', 'N/A')}")
        context_lines.append(f"Tone: {data.get('tone', 'N/A')}")
        context_lines.append(f"Humor Style: {data.get('humor_style', 'N/A')}")
        context_lines.append(f"Formality Level: {data.get('formality_level', 'N/A')}\n")
        
        # Voice & Style
        context_lines.append("## VOICE & COMMUNICATION STYLE\n")
        context_lines.append(f"Writing Style: {data.get('writing_style', 'N/A')}")
        context_lines.append(f"Vocabulary Level: {data.get('vocabulary_level', 'N/A')}")
        context_lines.append(f"Sentence Structure: {data.get('sentence_structure', 'N/A')}")
        context_lines.append(f"Emoji Usage: {data.get('emoji_usage', 'N/A')}")
        context_lines.append(f"Slang Usage: {data.get('slang_usage', 'N/A')}\n")
        
        # Interests & Expertise
        context_lines.append("## INTERESTS & EXPERTISE\n")
        context_lines.append(f"Main Topics: {data.get('main_topics', 'N/A')}")
        context_lines.append(f"Expertise Areas: {data.get('expertise_areas', 'N/A')}")
        context_lines.append(f"Hobbies: {data.get('hobbies', 'N/A')}")
        context_lines.append(f"Passions: {data.get('passions', 'N/A')}\n")
        
        # Values & Worldview
        context_lines.append("## VALUES & WORLDVIEW\n")
        context_lines.append(f"Core Values: {data.get('core_values', 'N/A')}")
        context_lines.append(f"Political Stance: {data.get('political_stance', 'N/A')}")
        context_lines.append(f"Causes Supported: {data.get('causes_supported', 'N/A')}")
        context_lines.append(f"Controversial Topics Approach: {data.get('controversial_topics', 'N/A')}\n")
        
        # Content Strategy
        context_lines.append("## CONTENT STRATEGY\n")
        context_lines.append(f"Content Themes: {data.get('content_themes', 'N/A')}")
        context_lines.append(f"Post Frequency: {data.get('post_frequency', 'N/A')}")
        context_lines.append(f"Preferred Formats: {data.get('preferred_formats', 'N/A')}")
        context_lines.append(f"Hashtag Style: {data.get('hashtag_style', 'N/A')}\n")
        
        # Engagement
        context_lines.append("## ENGAGEMENT APPROACH\n")
        context_lines.append(f"Engagement Style: {data.get('engagement_approach', 'N/A')}")
        context_lines.append(f"Controversy Level: {data.get('controversy_level', 'N/A')}")
        context_lines.append(f"Authenticity Level: {data.get('authenticity_level', 'N/A')}\n")
        
        # Reference Content with parsed data
        if threads_data['profiles'] or threads_data['threads']:
            context_lines.append("## REFERENCE CONTENT ANALYSIS\n")
            
            # Extract parsed data - filter out errors
            parsed_profiles = [p.get('parsed_data') for p in threads_data['profiles'] 
                             if p.get('parsed_data') and 'error' not in p.get('parsed_data', {})]
            parsed_threads = [t.get('parsed_data') for t in threads_data['threads'] 
                            if t.get('parsed_data') and 'error' not in t.get('parsed_data', {})]
            
            # Format and add to context
            formatted_content = format_content_for_context(parsed_profiles, parsed_threads)
            context_lines.extend(formatted_content)
            
            # Add engagement insights
            insights = analyze_engagement_patterns(parsed_profiles, parsed_threads)
            if any(insights.values()):
                context_lines.append("### ENGAGEMENT INSIGHTS:")
                if insights['high_performing_topics']:
                    context_lines.append(f"- High-performing topics: {', '.join(insights['high_performing_topics'])}")
                if insights['engagement_triggers']:
                    context_lines.append(f"- Engagement triggers: {', '.join(insights['engagement_triggers'])}")
                if insights['content_formats']:
                    context_lines.append(f"- Effective formats: {', '.join(insights['content_formats'])}")
                context_lines.append("")
        
        # Examples
        context_lines.append("## VOICE SAMPLES & EXAMPLES\n")
        context_lines.append(f"Example Posts:\n{data.get('example_posts', 'N/A')}\n")
        context_lines.append(f"Example Responses:\n{data.get('example_responses', 'N/A')}\n")
        context_lines.append(f"Favorite Phrases: {data.get('favorite_phrases', 'N/A')}")
        context_lines.append(f"Words to Avoid: {data.get('words_to_avoid', 'N/A')}\n")
        
        # Audience & Goals
        context_lines.append("## TARGET AUDIENCE & GOALS\n")
        context_lines.append(f"Target Audience: {data.get('target_audience', 'N/A')}")
        context_lines.append(f"Content Goals: {data.get('content_goals', 'N/A')}")
        context_lines.append(f"Brand Alignment: {data.get('brand_alignment', 'N/A')}\n")
        
        # Boundaries
        context_lines.append("## BOUNDARIES & RESTRICTIONS\n")
        context_lines.append(f"Topics to Avoid: {data.get('topics_to_avoid', 'N/A')}")
        context_lines.append(f"Language Restrictions: {data.get('language_restrictions', 'N/A')}")
        context_lines.append(f"Brand Guidelines: {data.get('brand_guidelines', 'N/A')}\n")
        
        # Write to file
        context_dir = os.path.join(os.path.dirname(__file__), '..', 'context')
        os.makedirs(context_dir, exist_ok=True)
        filepath = os.path.join(context_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(context_lines))
        
        return jsonify({
            'message': 'Personality context created successfully',
            'filename': filename,
            'path': filepath,
            'parsed_links': {
                'profiles_count': len(threads_data['profiles']),
                'threads_count': len(threads_data['threads']),
                'profiles': [{'username': p.get('parsed_data', {}).get('user_info', {}).get('username', 'Unknown'), 'top_posts_count': len(p.get('parsed_data', {}).get('top_posts', []))} for p in threads_data['profiles'] if 'error' not in p.get('parsed_data', {})],
                'threads': [{'url': t['url'], 'like_count': t.get('parsed_data', {}).get('main_thread', {}).get('like_count', 0)} for t in threads_data['threads'] if 'error' not in t.get('parsed_data', {})]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@personality_bp.route('/list', methods=['GET'])
def list_personalities():
    """List all available personality context files"""
    try:
        context_dir = os.path.join(os.path.dirname(__file__), '..', 'context')
        
        if not os.path.exists(context_dir):
            return jsonify({'personalities': []})
        
        # Get all .txt files in context directory
        pattern = os.path.join(context_dir, '*.txt')
        files = glob.glob(pattern)
        
        personalities = []
        for file_path in files:
            filename = os.path.basename(file_path)
            # Skip default system files
            if filename in ['default.txt', 'enhance.txt']:
                continue
                
            # Read first few lines to get name and creation date
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = content.split('\n')
                    
                    name = 'Unknown'
                    created = 'Unknown'
                    
                    for line in lines[:10]:  # Check first 10 lines
                        if line.startswith('# AI Personality Context:'):
                            name = line.replace('# AI Personality Context:', '').strip()
                        elif line.startswith('# Created:'):
                            created = line.replace('# Created:', '').strip()
                    
                    # Get file stats
                    stat = os.stat(file_path)
                    file_size = stat.st_size
                    modified = datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                    
                    personalities.append({
                        'filename': filename,
                        'name': name,
                        'created': created,
                        'modified': modified,
                        'size': file_size
                    })
                    
            except Exception as e:
                # If we can't read the file, still list it
                personalities.append({
                    'filename': filename,
                    'name': filename.replace('.txt', '').replace('_', ' ').title(),
                    'created': 'Unknown',
                    'modified': 'Unknown',
                    'size': 0
                })
        
        # Sort by modified date (newest first)
        personalities.sort(key=lambda x: x['modified'], reverse=True)
        
        return jsonify({'personalities': personalities})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@personality_bp.route('/load/<filename>', methods=['GET'])
def load_personality(filename):
    """Load a personality context file and parse it back to form data"""
    try:
        context_dir = os.path.join(os.path.dirname(__file__), '..', 'context')
        file_path = os.path.join(context_dir, filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse the content back to form data structure
        parsed_data = parse_personality_file(content)
        
        return jsonify({
            'success': True,
            'data': parsed_data,
            'filename': filename
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def parse_personality_file(content):
    """Parse personality context file back to form data structure"""
    data = {}
    lines = content.split('\n')
    
    # Simple parsing - look for "field: value" patterns
    for line in lines:
        line = line.strip()
        if ':' in line and not line.startswith('#') and not line.startswith('='):
            # Split on first colon only
            parts = line.split(':', 1)
            if len(parts) == 2:
                key = parts[0].strip()
                value = parts[1].strip()
                
                # Map display names back to form field names
                field_mapping = {
                    'Name': 'name',
                    'Age': 'age',
                    'Location': 'location',
                    'Occupation': 'occupation',
                    'Background': 'background',
                    'Personality Type': 'personality_type',
                    'Tone': 'tone',
                    'Humor Style': 'humor_style',
                    'Formality Level': 'formality_level',
                    'Writing Style': 'writing_style',
                    'Vocabulary Level': 'vocabulary_level',
                    'Sentence Structure': 'sentence_structure',
                    'Emoji Usage': 'emoji_usage',
                    'Slang Usage': 'slang_usage',
                    'Main Topics': 'main_topics',
                    'Expertise Areas': 'expertise_areas',
                    'Hobbies': 'hobbies',
                    'Passions': 'passions',
                    'Core Values': 'core_values',
                    'Political Stance': 'political_stance',
                    'Causes Supported': 'causes_supported',
                    'Controversial Topics Approach': 'controversial_topics',
                    'Content Themes': 'content_themes',
                    'Post Frequency': 'post_frequency',
                    'Preferred Formats': 'preferred_formats',
                    'Hashtag Style': 'hashtag_style',
                    'Engagement Style': 'engagement_approach',
                    'Controversy Level': 'controversy_level',
                    'Authenticity Level': 'authenticity_level',
                    'Example Posts': 'example_posts',
                    'Example Responses': 'example_responses',
                    'Favorite Phrases': 'favorite_phrases',
                    'Words to Avoid': 'words_to_avoid',
                    'Target Audience': 'target_audience',
                    'Content Goals': 'content_goals',
                    'Brand Alignment': 'brand_alignment',
                    'Topics to Avoid': 'topics_to_avoid',
                    'Language Restrictions': 'language_restrictions',
                    'Brand Guidelines': 'brand_guidelines'
                }
                
                if key in field_mapping and value != 'N/A':
                    data[field_mapping[key]] = value
    
    return data