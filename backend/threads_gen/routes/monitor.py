from flask import Blueprint, request, jsonify
from services.monitor import get_monitor

monitor_bp = Blueprint('monitor', __name__)

@monitor_bp.route('/start', methods=['POST'])
def start_monitor():
    """Start the auto-generation monitor"""
    try:
        monitor = get_monitor()
        monitor.start_monitoring()
        return jsonify({
            'success': True,
            'message': 'Auto-generation monitor started'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/stop', methods=['POST'])
def stop_monitor():
    """Stop the auto-generation monitor"""
    try:
        monitor = get_monitor()
        monitor.stop_monitoring()
        return jsonify({
            'success': True,
            'message': 'Auto-generation monitor stopped'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/status', methods=['GET'])
def get_status():
    """Get monitor status"""
    try:
        monitor = get_monitor()
        status = monitor.get_status()
        return jsonify({
            'success': True,
            'status': status
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/accounts', methods=['GET'])
def get_account_status():
    """Get status for all accounts"""
    try:
        monitor = get_monitor()
        accounts = monitor.get_account_status()
        return jsonify({
            'success': True,
            'accounts': accounts
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/logs', methods=['GET'])
def get_logs():
    """Get recent generation logs"""
    try:
        monitor = get_monitor()
        status = monitor.get_status()
        return jsonify({
            'success': True,
            'logs': status['recent_logs'],
            'total_logs': status['total_logs']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/force-check', methods=['POST'])
def force_check():
    """Force an immediate check and generation if needed"""
    try:
        monitor = get_monitor()
        accounts_needing_generation = monitor._check_accounts_need_generation()
        
        generated_accounts = []
        for account_data in accounts_needing_generation:
            try:
                monitor._auto_generate_for_account(account_data)
                generated_accounts.append({
                    'username': account_data['account'].username,
                    'success': True
                })
            except Exception as e:
                generated_accounts.append({
                    'username': account_data['account'].username,
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'message': f'Checked {len(accounts_needing_generation)} accounts needing generation',
            'results': generated_accounts
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500