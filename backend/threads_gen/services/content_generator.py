import requests
import json
from typing import Optional

class ContentGenerator:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
    
    def generate_content(self, prompt: str, context: Optional[str] = None) -> str:
        messages = []
        
        if context:
            messages.append({
                "role": "system",
                "content": context
            })
        
        messages.append({
            "role": "user",
            "content": [{"type": "text", "text": prompt}]
        })
        
        payload = {
            "model": "x-ai/grok-4-fast",
            "messages": messages
        }
        
        response = requests.post(
            self.base_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            data=json.dumps(payload)
        )
        
        if response.status_code == 200:
            result = response.json()
            return result['choices'][0]['message']['content'].strip()
        else:
            raise Exception(f"Failed to generate content: {response.text}")