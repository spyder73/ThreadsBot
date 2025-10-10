import os
import requests
import json
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create blueprint
openrouter_bp = Blueprint('openrouter', __name__)

# Get API key from environment
api_key = os.getenv('OPENROUTER_API_KEY')

if not api_key:
    raise ValueError("OPENROUTER_API_KEY not found in environment variables")

def load_context(context_file):
    """Load context from file"""
    if not context_file:
        return None
    
    context_path = os.path.join('context', context_file)
    if os.path.exists(context_path):
        with open(context_path, 'r', encoding='utf-8') as f:
            return f.read()
    return None

@openrouter_bp.route('/grok4_fast', methods=['POST'])
def grok4_fast():
    """Grok 4 Fast with optional image input and context"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get text content (required)
        text_content = data.get('text', 'Create an engaging social media post.')
        context_file = data.get('context_file')
        
        # Load context if provided
        context = load_context(context_file)
        
        # Build messages array
        messages = []
        
        # Add system message with context if available
        if context:
            messages.append({
                "role": "system",
                "content": context
            })
        
        # Build user message content
        message_content = []
        
        # Always add text
        message_content.append({
            "type": "text",
            "text": text_content
        })
        
        # Add image if provided
        if 'image_url' in data and data['image_url']:
            message_content.append({
                "type": "image_url",
                "image_url": {
                    "url": data['image_url']
                }
            })
        
        # Add user message
        messages.append({
            "role": "user",
            "content": message_content
        })
        
        # Prepare the request payload
        payload = {
            "model": "x-ai/grok-4-fast",
            "messages": messages
        }
        
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            data=json.dumps(payload)
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({
                'error': 'Failed to get response from OpenRouter', 
                'details': response.text,
                'status_code': response.status_code
            }), response.status_code
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@openrouter_bp.route('/generate_title', methods=['POST'])
def generate_title():
    """Generate a title for social media post with context"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        description = data.get('description', '')
        platform = data.get('platform', 'general')
        style = data.get('style', 'engaging')
        context_file = data.get('context_file')
        
        if not description:
            return jsonify({'error': 'Description is required'}), 400
        
        # Load context
        context = load_context(context_file)
        
        # Build enhanced context
        enhanced_context = context if context else ""
        enhanced_context += f"\n\nCreate a {style} title for a {platform} post about: {description}"
        enhanced_context += "\n\nGuidelines: Keep it concise and attention-grabbing, make it platform-appropriate, use relevant keywords, avoid clickbait, maximum 100 characters. Return only the title, nothing else."
        
        # Build messages
        messages = []
        
        messages.append({
            "role": "system",
            "content": enhanced_context
        })
        
        messages.append({
            "role": "user",
            "content": [{"type": "text", "text": "Generate the title now."}]
        })
        
        payload = {
            "model": "x-ai/grok-4-fast",
            "messages": messages
        }
        
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            data=json.dumps(payload)
        )
        
        if response.status_code == 200:
            result = response.json()
            title = result['choices'][0]['message']['content'].strip()
            return jsonify({'success': True, 'title': title})
        else:
            return jsonify({
                'error': 'Failed to generate title', 
                'details': response.text
            }), response.status_code
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@openrouter_bp.route('/generate_caption', methods=['POST'])
def generate_caption():
    """Generate a caption for social media post with context"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        title = data.get('title', '')
        platform = data.get('platform', 'general')
        tone = data.get('tone', 'friendly')
        include_hashtags = data.get('include_hashtags', True)
        context_file = data.get('context_file')
        
        if not title:
            return jsonify({'error': 'Title is required'}), 400
        
        # Load context
        context = load_context(context_file)
        
        # Build enhanced context
        enhanced_context = context if context else ""
        hashtag_instruction = "Include 3-5 relevant hashtags." if include_hashtags else "Do not include hashtags."
        enhanced_context += f"\n\nCreate a {tone} caption for a {platform} post with the title: \"{title}\""
        enhanced_context += f"\n\nGuidelines: Match the {tone} tone and {platform} platform style, keep it engaging and appropriate for the audience, {hashtag_instruction}, appropriate length for {platform}. Return only the caption, nothing else."
        
        # Build messages
        messages = []
        
        messages.append({
            "role": "system",
            "content": enhanced_context
        })
        
        messages.append({
            "role": "user",
            "content": [{"type": "text", "text": "Generate the caption now."}]
        })
        
        payload = {
            "model": "x-ai/grok-4-fast",
            "messages": messages
        }
        
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            data=json.dumps(payload)
        )
        
        if response.status_code == 200:
            result = response.json()
            caption = result['choices'][0]['message']['content'].strip()
            return jsonify({'success': True, 'caption': caption})
        else:
            return jsonify({
                'error': 'Failed to generate caption', 
                'details': response.text
            }), response.status_code
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500