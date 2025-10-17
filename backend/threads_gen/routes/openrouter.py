import os
import requests
import json
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from app import dir_path

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
    
    context_path = os.path.join(dir_path, 'context', context_file)
    if os.path.exists(context_path):
        with open(context_path, 'r', encoding='utf-8') as f:
            return f.read()
    return None

@openrouter_bp.route('/models', methods=['GET'])
def get_models():
    """Get available models from OpenRouter"""
    try:
        response = requests.get(
            url="https://openrouter.ai/api/v1/models",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        )
        
        if response.status_code == 200:
            models_data = response.json()
            
            # Extract and format models
            formatted_models = []
            for model in models_data.get('data', []):
                # Skip models that are too expensive or specialized
                pricing = model.get('pricing', {})
                prompt_price = float(pricing.get('prompt', '999'))
                
                # Only include reasonably priced models (less than $0.01 per 1K tokens)
                if prompt_price < 0.00001:
                    formatted_models.append({
                        "id": model['id'],
                        "name": model.get('name', model['id']),
                        "provider": model['id'].split('/')[0] if '/' in model['id'] else 'Unknown',
                        "context_length": model.get('context_length', 0),
                        "prompt_price": prompt_price,
                        "completion_price": float(pricing.get('completion', '0'))
                    })
            
            # Sort by popularity/provider preference
            provider_priority = ['x-ai', 'anthropic', 'openai', 'meta-llama', 'google', 'nvidia']
            
            def sort_key(model):
                provider = model['provider'].lower()
                if provider in provider_priority:
                    return (provider_priority.index(provider), model['prompt_price'])
                return (len(provider_priority), model['prompt_price'])
            
            formatted_models.sort(key=sort_key)
            
            # Limit to top 20 models to avoid overwhelming the UI
            return jsonify({'models': formatted_models[:20]})
        else:
            # Fallback to default models if API fails
            return jsonify({'models': [
                {"id": "x-ai/grok-4-fast", "name": "Grok 4 Fast", "provider": "X.AI", "context_length": 128000},
                {"id": "anthropic/claude-3.5-sonnet", "name": "Claude 3.5 Sonnet", "provider": "Anthropic", "context_length": 200000}
            ]})
    
    except Exception as e:
        # Fallback to default models
        return jsonify({'models': [
            {"id": "x-ai/grok-4-fast", "name": "Grok 4 Fast", "provider": "X.AI", "context_length": 128000}
        ]})

@openrouter_bp.route('/inference', methods=['POST'])
def inference():
    """Generic inference call with optional image input and context"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get parameters
        text_content = data.get('text', 'Generate content.')
        model = data.get('model', 'x-ai/grok-4-fast')
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
            "model": model,
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
            content = result['choices'][0]['message']['content']
            return jsonify({'success': True, 'content': content, 'model_used': model, 'payload': payload})
        else:
            return jsonify({
                'error': 'Failed to get response from OpenRouter', 
                'details': response.text,
                'status_code': response.status_code
            }), response.status_code
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Keep the existing grok4_fast for backward compatibility
@openrouter_bp.route('/grok4_fast', methods=['POST'])
def grok4_fast():
    """Legacy endpoint - redirects to inference with grok-4-fast"""
    try:
        data = request.json
        if data:
            data['model'] = 'x-ai/grok-4-fast'
        return inference()
    except Exception as e:
        return jsonify({'error': str(e)}), 500