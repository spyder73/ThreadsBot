import os
from dotenv import load_dotenv
from upload_post import UploadPostClient
from flask import Blueprint, request, jsonify

# Load environment variables
load_dotenv()

# Create blueprint
upload_bp = Blueprint('upload', __name__)

# Get API key from environment
uploadpost_api_key = os.getenv('UPLOADPOST_API_KEY')

if not uploadpost_api_key:
    raise ValueError("UPLOADPOST_API_KEY not found in environment variables")

# Initialize client
client = UploadPostClient(api_key=uploadpost_api_key)

@upload_bp.route('/schedule-video', methods=['POST'])
def schedule_video():
    """Schedule a video post"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['video_path', 'title', 'user', 'platforms']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Check if video file exists
        if not os.path.exists(data['video_path']):
            return jsonify({"error": "Video file not found"}), 404
        
        if data is not None:
            response = client.upload_video(
                video_path=data['video_path'],
                title=data['title'],
                user=data['user'],
                platforms=data['platforms'],
                scheduled_date=data['scheduled_date']  # Optional
            )
        else:
            return jsonify({"error": "No data provided"}), 400
        
        return jsonify({
            "success": True,
            "type": "video",
            "response": response
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@upload_bp.route('/schedule-photo', methods=['POST'])
def schedule_photo():
    """Schedule a photo post"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['photos', 'title', 'user', 'platforms']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Check if photo files exist
        for photo in data['photos']:
            if not os.path.exists(photo):
                return jsonify({"error": f"Photo file not found: {photo}"}), 404
        
        response = client.upload_photos(
            photos=[data['photos']],
            title=data['title'],
            user=data['user'],
            platforms=data['platforms'],
            scheduled_date=data['scheduled_date'] 
        )
        
        return jsonify({
            "success": True,
            "type": "photo",
            "response": response
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@upload_bp.route('/schedule-text', methods=['POST'])
def schedule_text():
    """Schedule a text-only post"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['title', 'user', 'platforms']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        response = client.upload_text(
            title=data['title'],
            user=data['user'],
            platforms=data['platforms']#,
            #scheduled_date=data['scheduled_date']  # Optional
        )
        
        return jsonify({
            "success": True,
            "type": "text",
            "response": response
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@upload_bp.route('/test', methods=['GET'])
def test_endpoint():
    """Test endpoint to verify server is working"""
    return jsonify({
        "message": "Server is working!",
        "endpoints": [
            "/schedule-video",
            "/schedule-photo", 
            "/schedule-text"
        ]
    })