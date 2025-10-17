from flask import Blueprint, request, jsonify
from datetime import datetime
from models.database import Database
from services.context_manager import ContextManager
from services.content_generator import ContentGenerator
from services.scheduler import SchedulerService
import sqlite3
from dotenv import load_dotenv
import os

queue_bp = Blueprint('queue', __name__)

# Load environment variables
load_dotenv()

# Get API key from environment
openrouter_api_key = os.getenv('OPENROUTER_API_KEY')

if not openrouter_api_key:
    raise ValueError("OPENROUTER_API_KEY not found in environment variables")


db = Database()
context_manager = ContextManager()
content_generator = ContentGenerator(api_key=openrouter_api_key)
scheduler = SchedulerService(db, content_generator, context_manager)

@queue_bp.route('/create-account', methods=['POST'])
def create_account():
    data = request.json
    if not data or 'username' not in data or 'platforms' not in data:
        return jsonify({'error': 'Username and platforms required'}), 400
    
    try:
        account = db.create_account(
            username=data['username'],
            platforms=data['platforms'],
            context_file=data.get('context_file')
        )
        return jsonify({'success': True, 'account': account.__dict__})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@queue_bp.route('/accounts', methods=['GET'])
def get_accounts():
    try:
        accounts = db.get_all_accounts()
        return jsonify({'success': True, 'accounts': [account.__dict__ for account in accounts]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@queue_bp.route('/generate-and-save', methods=['POST'])
def generate_and_save():
    data = request.json
    if not data or 'username' not in data or 'prompt' not in data or 'content_type' not in data:
        return jsonify({'error': 'Username, prompt, and content_type required'}), 400
    
    try:
        account = db.get_account(data['username'])
        if not account:
            return jsonify({'error': 'Account not found'}), 404
        
        
        if account.context_file is not None:
            context = context_manager.get_context(account.context_file)
        generated_text = content_generator.generate_content(data['prompt'], context)
        
        metadata = {
            'prompt': data['prompt'],
            'platform': data.get('platform', 'general'),
            'style': data.get('style', 'engaging'),
            'tone': data.get('tone', 'friendly'),
            'context_file': account.context_file
        }
        
        saved_content = db.save_generated_content(
            account_id=account.id,
            content_type=data['content_type'],
            content=generated_text,
            metadata=metadata
        )
        
        return jsonify({'success': True, 'content': saved_content.__dict__})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@queue_bp.route('/generated-content', methods=['GET'])
def get_generated_content():
    username = request.args.get('username')
    content_type = request.args.get('content_type')
    
    try:
        account_id = None
        if username:
            account = db.get_account(username)
            if not account:
                return jsonify({'error': 'Account not found'}), 404
            account_id = account.id
        
        contents = db.get_generated_content(account_id, content_type)
        return jsonify({'success': True, 'content': [content.__dict__ for content in contents]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@queue_bp.route('/schedule-generated-content', methods=['POST'])
def schedule_generated_content():
    data = request.json
    if not data or 'content_id' not in data or 'scheduled_date' not in data:
        return jsonify({'error': 'content_id and scheduled_date required'}), 400
    
    try:
        contents = db.get_generated_content()
        content = next((c for c in contents if c.id == data['content_id']), None)
        
        if not content:
            return jsonify({'error': 'Content not found'}), 404
        
        account = next((acc for acc in db.get_all_accounts() if acc.id == content.account_id), None)
        if not account:
            return jsonify({'error': 'Account not found'}), 404

        scheduled_post = db.create_scheduled_post(
            account_id=content.account_id,
            content=content.content,
            platforms=data.get('platforms', account.platforms),
            scheduled_date=data['scheduled_date'],
            content_id=content.id
        )
        
        return jsonify({'success': True, 'scheduled_post': scheduled_post.__dict__})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@queue_bp.route('/schedule-batch', methods=['POST'])
def schedule_batch():
    data = request.json
    if not data or 'username' not in data or 'prompts' not in data:
        return jsonify({'error': 'Username and prompts required'}), 400
    
    try:
        posts = scheduler.schedule_daily_posts(
            username=data['username'],
            prompts=data['prompts'],
            target_date=data.get('target_date')
        )
        
        return jsonify({
            'success': True,
            'scheduled_posts': [post.__dict__ for post in posts]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@queue_bp.route('/get-queue', methods=['GET'])
def get_queue():
    username = request.args.get('username')
    
    try:
        if username:
            account = db.get_account(username)
            if not account:
                return jsonify({'error': 'Account not found'}), 404
            posts = db.get_scheduled_posts(account.id)
        else:
            posts = db.get_scheduled_posts()
        
        return jsonify({
            'success': True,
            'posts': [post.__dict__ for post in posts]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@queue_bp.route('/process-queue', methods=['POST'])
def process_queue():
    try:
        ready_posts = scheduler.get_posts_for_upload()
        
        for post in ready_posts:
            db.update_post_status(post.id, "processing")
        
        return jsonify({
            'success': True,
            'ready_posts': [post.__dict__ for post in ready_posts]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@queue_bp.route('/contexts', methods=['GET'])
def list_contexts():
    try:
        contexts = context_manager.list_contexts()
        return jsonify({'success': True, 'contexts': contexts})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@queue_bp.route('/update-post/<post_id>', methods=['PUT'])
def update_post(post_id):
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        # Get the post first
        posts = db.get_scheduled_posts()
        post = next((p for p in posts if p.id == post_id), None)
        
        if not post:
            return jsonify({'error': 'Post not found'}), 404
        
        # Check if post is editable (scheduled and in future)
        if post.status != 'scheduled' or datetime.fromisoformat(post.scheduled_date) <= datetime.now():
            return jsonify({'error': 'Post cannot be edited'}), 400
        
        # Update the post in database
        with sqlite3.connect(db.db_path) as conn:
            update_fields = []
            params = []
            
            if 'content' in data:
                update_fields.append('content = ?')
                params.append(data['content'])
            
            if 'scheduled_date' in data:
                update_fields.append('scheduled_date = ?')
                params.append(data['scheduled_date'])
            
            if update_fields:
                params.append(post_id)
                query = f"UPDATE scheduled_posts SET {', '.join(update_fields)} WHERE id = ?"
                conn.execute(query, params)
                conn.commit()
        
        return jsonify({'success': True, 'message': 'Post updated successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@queue_bp.route('/delete-post/<post_id>', methods=['DELETE'])
def delete_post(post_id):
    try:
        # Get the post first
        posts = db.get_scheduled_posts()
        post = next((p for p in posts if p.id == post_id), None)
        
        if not post:
            return jsonify({'error': 'Post not found'}), 404
        
        # Delete the post
        with sqlite3.connect(db.db_path) as conn:
            cursor = conn.execute("DELETE FROM scheduled_posts WHERE id = ?", (post_id,))
            conn.commit()
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Post not found'}), 404
        
        return jsonify({'success': True, 'message': 'Post deleted successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_db_connection():
    """Get database connection"""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'scheduler.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@queue_bp.route('/posts', methods=['GET'])
def get_posts():
    """Get all posts with filtering"""
    try:
        status = request.args.get('status')
        
        conn = get_db_connection()
        
        if status:
            posts = conn.execute(
                'SELECT * FROM scheduled_posts WHERE status = ? ORDER BY created_at DESC',
                (status,)
            ).fetchall()
        else:
            posts = conn.execute(
                'SELECT * FROM scheduled_posts ORDER BY created_at DESC'
            ).fetchall()
        
        conn.close()
        
        # Convert to dict
        posts_list = [dict(post) for post in posts]
        
        return jsonify({'posts': posts_list})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@queue_bp.route('/delete_all', methods=['DELETE', 'POST'])
def delete_all_posts():
    """Delete all posts by status"""
    try:
        data = request.json
        statuses = data.get('statuses', [])
        
        if not statuses:
            return jsonify({'error': 'No statuses provided'}), 400
        
        conn = get_db_connection()
        
        deleted_count = 0
        for status in statuses:
            result = conn.execute('DELETE FROM scheduled_posts WHERE status = ?', (status,))
            deleted_count += result.rowcount
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': f'Deleted {deleted_count} posts',
            'deleted_count': deleted_count
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500