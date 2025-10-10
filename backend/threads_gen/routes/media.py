import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from models.database import Database

media_bp = Blueprint('media', __name__)
db = Database()

UPLOAD_FOLDER = 'data'
ALLOWED_EXTENSIONS = {
    'image': {'png', 'jpg', 'jpeg', 'gif', 'webp'},
    'video': {'mp4', 'avi', 'mov', 'mkv', 'webm'}
}

def allowed_file(filename, file_type):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS.get(file_type, set())

def get_file_type(filename):
    ext = filename.rsplit('.', 1)[1].lower()
    if ext in ALLOWED_EXTENSIONS['image']:
        return 'image'
    elif ext in ALLOWED_EXTENSIONS['video']:
        return 'video'
    return None

@media_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    account_id = request.form.get('account_id')
    description = request.form.get('description', '')
    
    if not account_id:
        return jsonify({'error': 'Account ID required'}), 400
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    file_type = get_file_type(file.filename)
    if not file_type:
        return jsonify({'error': 'File type not allowed'}), 400
    
    if file and file.filename is not None and allowed_file(file.filename, file_type):
        filename = secure_filename(file.filename)
        
        # Create account-specific directory
        account_dir = os.path.join(UPLOAD_FOLDER, account_id)
        os.makedirs(account_dir, exist_ok=True)
        
        file_path = os.path.join(account_dir, filename)
        file.save(file_path)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        try:
            media_file = db.save_media_file(
                account_id=account_id,
                filename=filename,
                file_path=file_path,
                file_type=file_type,
                description=description,
                file_size=file_size
            )
            
            return jsonify({'success': True, 'file': media_file.__dict__})
        except Exception as e:
            # Clean up file if database save fails
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'Invalid file'}), 400

@media_bp.route('/files/<account_id>', methods=['GET'])
def get_files(account_id):
    file_type = request.args.get('type')  # 'image' or 'video'
    
    try:
        files = db.get_media_files(account_id, file_type)
        return jsonify({
            'success': True, 
            'files': [file.__dict__ for file in files]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@media_bp.route('/files/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    try:
        # Get file info before deletion
        files = db.get_media_files(None)  # Get all files
        file_to_delete = next((f for f in files if f.id == file_id), None)
        
        if not file_to_delete:
            return jsonify({'error': 'File not found'}), 404
        
        # Delete from database
        success = db.delete_media_file(file_id)
        
        if success:
            # Delete physical file
            if os.path.exists(file_to_delete.file_path):
                os.remove(file_to_delete.file_path)
            
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Failed to delete file'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@media_bp.route('/stats/<account_id>', methods=['GET'])
def get_media_stats(account_id):
    try:
        all_files = db.get_media_files(account_id)
        images = [f for f in all_files if f.file_type == 'image']
        videos = [f for f in all_files if f.file_type == 'video']
        
        return jsonify({
            'success': True,
            'stats': {
                'total_files': len(all_files),
                'images': len(images),
                'videos': len(videos),
                'total_size': sum(f.file_size for f in all_files)
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500