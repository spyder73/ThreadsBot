import os
from dotenv import load_dotenv
from flask import Blueprint, request, jsonify
from models.database import Database
from services.content_generator import ContentGenerator
from services.context_manager import ContextManager
from services.generator import ContentGenerationService

# Load environment variables
load_dotenv()

generator_bp = Blueprint('generator', __name__)

# Get API key from environment
openrouter_api_key = os.getenv('OPENROUTER_API_KEY')

if not openrouter_api_key:
    raise ValueError("OPENROUTER_API_KEY not found in environment variables")

db = Database()
context_manager = ContextManager()
content_generator = ContentGenerator(api_key=openrouter_api_key)
generation_service = ContentGenerationService(db, content_generator, context_manager)

@generator_bp.route('/generate-content', methods=['POST'])
def generate_content():
    """Generate and schedule content for specified days"""
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    account_username = data.get('account_username')
    days = data.get('days', 3)
    settings = data.get('settings', {})
    
    if not account_username:
        return jsonify({'error': 'Account username required'}), 400
    
    try:
        result = generation_service.generate_posts_for_days(
            account_username=account_username,
            days=days,
            settings=settings
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@generator_bp.route('/check-pending-posts', methods=['GET'])
def check_pending_posts():
    """Check how many posts are left in the queue"""
    account_username = request.args.get('username')
    
    try:
        if account_username:
            account = db.get_account(account_username)
            if not account:
                return jsonify({'error': 'Account not found'}), 404
            posts = db.get_scheduled_posts(account.id)
        else:
            posts = db.get_scheduled_posts()
        
        # Filter only future posts
        from datetime import datetime
        future_posts = [
            post for post in posts 
            if datetime.fromisoformat(post.scheduled_date) > datetime.now()
            and post.status == 'scheduled'
        ]
        
        return jsonify({
            'success': True,
            'pending_posts': len(future_posts),
            'posts': [post.__dict__ for post in future_posts]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@generator_bp.route('/auto-generate-check', methods=['POST'])
def auto_generate_check():
    """Check if auto-generation should trigger (when 5 or fewer posts left)"""
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    account_username = data.get('account_username')
    
    if not account_username:
        return jsonify({'error': 'Account username required'}), 400
    
    try:
        account = db.get_account(account_username)
        if not account:
            return jsonify({'error': 'Account not found'}), 404
        
        posts = db.get_scheduled_posts(account.id)
        
        # Count future posts
        from datetime import datetime
        future_posts = [
            post for post in posts 
            if datetime.fromisoformat(post.scheduled_date) > datetime.now()
            and post.status == 'scheduled'
        ]
        
        should_generate = len(future_posts) <= 5
        
        return jsonify({
            'success': True,
            'should_generate': should_generate,
            'pending_posts': len(future_posts),
            'message': f'Currently {len(future_posts)} posts in queue'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500