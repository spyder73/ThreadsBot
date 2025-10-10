import os
from typing import Optional

class ContextManager:
    def __init__(self, context_dir: str = "context"):
        self.context_dir = context_dir
        os.makedirs(context_dir, exist_ok=True)
    
    def get_context(self, context_file: str) -> Optional[str]:
        if not context_file:
            return None
        
        file_path = os.path.join(self.context_dir, context_file)
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        return None
    
    def list_contexts(self) -> list:
        return [f for f in os.listdir(self.context_dir) if f.endswith('.txt')]