import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    CORS(app)
    
    # Import and register blueprints
    from routes.upload import upload_bp
    from routes.openrouter import openrouter_bp
    from routes.queue import queue_bp
    from routes.media import media_bp
    from routes.generator import generator_bp
    from routes.monitor import monitor_bp
    from routes.executor import executor_bp
    from routes.personality import personality_bp
    
    app.register_blueprint(upload_bp)
    app.register_blueprint(openrouter_bp, url_prefix='/ai')
    app.register_blueprint(queue_bp, url_prefix='/queue')
    app.register_blueprint(media_bp, url_prefix='/media')
    app.register_blueprint(generator_bp, url_prefix='/generator')
    app.register_blueprint(monitor_bp, url_prefix='/monitor')
    app.register_blueprint(executor_bp, url_prefix='/executor')
    app.register_blueprint(personality_bp, url_prefix='/personality')
    
    @app.route("/")
    def home():
        return {"message": "Social Media Scheduler API", "status": "running"}
    
    return app

if __name__ == "__main__":
    app = create_app()
    
    # Start background services
    print("Starting background services...")
    
    from services.post_executor import get_executor
    from services.monitor import get_monitor
    
    executor = get_executor()
    monitor = get_monitor()
    
    executor.start_executor()
    monitor.start_monitoring()
    
    print("✅ All services started!")
    print("✅ Post Executor: Running")
    print("✅ Auto-Generation Monitor: Running")
    
    app.run(debug=True, host='0.0.0.0', port=8000)
