import React, { useState } from 'react';
import { queueService } from '../services/apiService';

const QueueManager = () => {
  const [scheduleData, setScheduleData] = useState({
    username: '',
    prompts: [''],
    target_date: '',
  });
  const [queueUsername, setQueueUsername] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setScheduleData(prev => ({ ...prev, [name]: value }));
  };

  const handlePromptChange = (index, value) => {
    const newPrompts = [...scheduleData.prompts];
    newPrompts[index] = value;
    setScheduleData(prev => ({ ...prev, prompts: newPrompts }));
  };

  const addPrompt = () => {
    setScheduleData(prev => ({
      ...prev,
      prompts: [...prev.prompts, '']
    }));
  };

  const removePrompt = (index) => {
    setScheduleData(prev => ({
      ...prev,
      prompts: prev.prompts.filter((_, i) => i !== index)
    }));
  };

  const scheduleBatch = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await queueService.scheduleBatch(scheduleData);
    setResponse(result);
    setLoading(false);
  };

  const getQueue = async () => {
    setLoading(true);
    const result = await queueService.getQueue(queueUsername || null);
    setResponse(result);
    setLoading(false);
  };

  const processQueue = async () => {
    setLoading(true);
    const result = await queueService.processQueue();
    setResponse(result);
    setLoading(false);
  };

  return (
    <div className="component-container">
      <h2>Queue Manager</h2>

      <div className="section">
        <h3>Schedule Batch Posts</h3>
        <form onSubmit={scheduleBatch} className="form">
          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              name="username"
              value={scheduleData.username}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Target Date (optional):</label>
            <input
              type="date"
              name="target_date"
              value={scheduleData.target_date}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label>Prompts:</label>
            {scheduleData.prompts.map((prompt, index) => (
              <div key={index} className="prompt-input">
                <textarea
                  value={prompt}
                  onChange={(e) => handlePromptChange(index, e.target.value)}
                  placeholder={`Prompt ${index + 1}`}
                  required
                />
                {scheduleData.prompts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePrompt(index)}
                    className="remove-button"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addPrompt} className="add-button">
              Add Prompt
            </button>
          </div>

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Scheduling...' : 'Schedule Batch'}
          </button>
        </form>
      </div>

      <div className="section">
        <h3>Queue Operations</h3>
        <div className="queue-controls">
          <div className="form-group">
            <label>Username (optional):</label>
            <input
              type="text"
              value={queueUsername}
              onChange={(e) => setQueueUsername(e.target.value)}
              placeholder="Leave empty for all posts"
            />
          </div>
          <button onClick={getQueue} disabled={loading} className="control-button">
            Get Queue
          </button>
          <button onClick={processQueue} disabled={loading} className="control-button">
            Process Queue
          </button>
        </div>
      </div>

      {response && (
        <div className={`response ${response.success ? 'success' : 'error'}`}>
          <h3>Response:</h3>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default QueueManager;