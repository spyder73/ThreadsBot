import React, { useState, useEffect } from 'react';
import { openrouterService, personalityService } from '../services/apiService';

const AITester = () => {
  const [models, setModels] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [selectedModel, setSelectedModel] = useState('x-ai/grok-4-fast');
  const [selectedContext, setSelectedContext] = useState('');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadModels();
    loadContexts();
  }, []);

  const loadModels = async () => {
    try {
      const result = await openrouterService.getModels();
      if (result.success) {
        setModels(result.data.models || []);
      }
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const loadContexts = async () => {
    try {
      const result = await personalityService.getPersonalities();
      if (result.success) {
        // Transform personality list to context format
        const personalities = result.data.personalities || [];
        const contextOptions = [
          {
            filename: '',
            display_name: 'No Context',
            name: 'No Context'
          },
          // Add default contexts
          {
            filename: 'default.txt',
            display_name: 'Default Context',
            name: 'Default Context'
          },
          {
            filename: 'enhance.txt',
            display_name: 'Enhancement Context',
            name: 'Enhancement Context'
          },
          // Add personality contexts
          ...personalities.map(p => ({
            filename: p.filename,
            display_name: p.name || p.filename.replace('.txt', '').replace('_', ' '),
            name: p.name
          }))
        ];
        
        setContexts(contextOptions);
      }
    } catch (error) {
      console.error('Error loading contexts:', error);
      // Set fallback contexts
      setContexts([
        { filename: '', display_name: 'No Context', name: 'No Context' },
        { filename: 'default.txt', display_name: 'Default Context', name: 'Default Context' }
      ]);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    try {
      setLoading(true);
      const requestData = {
        text: prompt,
        model: selectedModel
      };

      // Add context file if selected
      if (selectedContext) {
        requestData.context_file = selectedContext;
      }

      const result = await openrouterService.inference(requestData);
      
      if (result.success) {
        setResponse(result.data.content);
      } else {
        setResponse('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      setResponse('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-tester">
      <h2>🤖 AI Model Tester</h2>
      
      <div className="controls-section">
        <div className="model-selector">
          <label>Select Model:</label>
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {models.map(model => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.provider})
              </option>
            ))}
          </select>
        </div>

        <div className="context-selector">
          <label>Select Context (Optional):</label>
          <select 
            value={selectedContext} 
            onChange={(e) => setSelectedContext(e.target.value)}
          >
            {contexts.map(context => (
              <option key={context.filename} value={context.filename}>
                {context.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="prompt-section">
        <label>Prompt:</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
          rows={6}
        />
      </div>

      <div className="action-section">
        <button 
          onClick={handleSubmit} 
          disabled={loading || !prompt.trim()}
          className="generate-btn"
        >
          {loading ? '🔄 Generating...' : '🚀 Generate'}
        </button>
      </div>

      {response && (
        <div className="response-section">
          <h3>Response:</h3>
          <div className="response-content">
            <pre>{response}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITester;