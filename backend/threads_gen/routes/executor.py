from flask import Blueprint, jsonify
from services.post_executor import get_executor

executor_bp = Blueprint('executor', __name__)

@executor_bp.route('/start', methods=['POST'])
def start_executor():
    """Start the post executor"""
    try:
        executor = get_executor()
        executor.start_executor()
        return jsonify({'success': True, 'message': 'Post executor started'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@executor_bp.route('/stop', methods=['POST'])
def stop_executor():
    """Stop the post executor"""
    try:
        executor = get_executor()
        executor.stop_executor()
        return jsonify({'success': True, 'message': 'Post executor stopped'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@executor_bp.route('/status', methods=['GET'])
def get_executor_status():
    """Get executor status"""
    try:
        executor = get_executor()
        return jsonify({
            'success': True,
            'is_running': executor.is_running,
            'check_interval': executor.check_interval
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500