import React, { useState, useEffect } from 'react';
import { aiService, queueService } from '../services/apiService';

const AITester = () => {
  const [activeTest, setActiveTest] = useState('grok');
  const [formData, setFormData] = useState({
    text: '',
    image_url: '',
    description: '',
    platform: 'general',
    style: 'engaging',
    title: '',
    tone: 'friendly',
    include_hashtags: true,
    username: '',
  });
  const [accounts, setAccounts] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [generatedContent, setGeneratedContent] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
    loadContexts();
  }, []);

  useEffect(() => {
    if (formData.username) {
      loadGeneratedContent();
    }
  }, [formData.username]);

  const loadAccounts = async () => {
    const result = await queueService.getAccounts();
    if (result.success) {
      setAccounts(result.data.accounts);
    }
  };

  const loadContexts = async () => {
    const result = await queueService.getContexts();
    if (result.success) {
      setContexts(result.data.contexts);
    }
  };

  const loadGeneratedContent = async () => {
    if (!formData.username) return;
    const result = await queueService.getGeneratedContent(formData.username);
    if (result.success) {
      setGeneratedContent(result.data.content);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const generateAndSave = async (contentType, prompt) => {
    if (!formData.username) {
      setResponse({ success: false, error: 'Please select an account first' });
      return;
    }

    setLoading(true);
    
    // Get the selected account to find its context file
    const selectedAccount = accounts.find(acc => acc.username === formData.username);
    
    const contentData = {
      username: formData.username,
      prompt: prompt,
      content_type: contentType,
      platform: formData.platform,
      style: formData.style,
      tone: formData.tone,
      context_file: selectedAccount?.context_file // Pass the context file
    };


    const result = await queueService.generateAndSave(contentData);
    setResponse(result);
    setLoading(false);
    
    if (result.success) {
      loadGeneratedContent(); // Refresh the content list
    }
  };

  const testGrok = async (e) => {
    e.preventDefault();
    setLoading(true);
    const selectedAccount = accounts.find(acc => acc.username === formData.username);

    const payload = { text: formData.text, context_file: selectedAccount?.context_file  };
    if (formData.image_url) {
      payload.image_url = formData.image_url;
    }
    
    const result = await aiService.grok4Fast(payload);
    setResponse(result);
    setLoading(false);
  };

  const testTitleGeneration = async (e) => {
    e.preventDefault();
    await generateAndSave('title', `Create a ${formData.style} title for a ${formData.platform} post about: ${formData.description}`);
  };

  const testCaptionGeneration = async (e) => {
    e.preventDefault();
    const hashtagInstruction = formData.include_hashtags ? "Include 3-5 relevant hashtags." : "Do not include hashtags.";
    const prompt = `Create a ${formData.tone} caption for a ${formData.platform} post with the title: "${formData.title}". ${hashtagInstruction}`;
    await generateAndSave('caption', prompt);
  };

  const scheduleContent = async (contentId, scheduledDate) => {
    const result = await queueService.scheduleGeneratedContent({
      content_id: contentId,
      scheduled_date: scheduledDate
    });
    
    if (result.success) {
      setResponse({ success: true, message: 'Content scheduled successfully!' });
    } else {
      setResponse(result);
    }
  };

  return (
    <div className="component-container">
      <h2>AI Content Generator</h2>

      <div className="form-group">
        <label>Select Account:</label>
        <select name="username" value={formData.username} onChange={handleInputChange}>
          <option value="">Select an account...</option>
          {accounts.map(account => (
            <option key={account.id} value={account.username}>
              {account.username} ({account.platforms.join(', ')})
            </option>
          ))}
        </select>
      </div>

      <div className="test-selector">
        <button
          className={activeTest === 'grok' ? 'active' : ''}
          onClick={() => setActiveTest('grok')}
        >
          Grok 4 Fast
        </button>
        <button
          className={activeTest === 'title' ? 'active' : ''}
          onClick={() => setActiveTest('title')}
        >
          Title Generation
        </button>
        <button
          className={activeTest === 'caption' ? 'active' : ''}
          onClick={() => setActiveTest('caption')}
        >
          Caption Generation
        </button>
        <button
          className={activeTest === 'library' ? 'active' : ''}
          onClick={() => setActiveTest('library')}
        >
          Content Library
        </button>
      </div>

      {activeTest === 'grok' && (
        <form onSubmit={testGrok} className="form">
          <div className="form-group">
            <label>Text Prompt:</label>
            <textarea
              name="text"
              value={formData.text}
              onChange={handleInputChange}
              placeholder="Enter your prompt..."
              required
            />
          </div>
          <div className="form-group">
            <label>Image URL (optional):</label>
            <input
              type="url"
              name="image_url"
              value={formData.image_url}
              onChange={handleInputChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Generating...' : 'Test Grok'}
          </button>
        </form>
      )}

      {activeTest === 'title' && (
        <form onSubmit={testTitleGeneration} className="form">
          <div className="form-group">
            <label>Description:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your content..."
              required
            />
          </div>
          <div className="form-group">
            <label>Platform:</label>
            <select name="platform" value={formData.platform} onChange={handleInputChange}>
              <option value="general">General</option>
              <option value="twitter">Twitter</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="linkedin">LinkedIn</option>
              <option value="threads">Threads</option>
            </select>
          </div>
          <div className="form-group">
            <label>Style:</label>
            <select name="style" value={formData.style} onChange={handleInputChange}>
              <option value="engaging">Engaging</option>
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="viral">Viral</option>
            </select>
          </div>
          <button type="submit" disabled={loading || !formData.username} className="submit-button">
            {loading ? 'Generating...' : 'Generate & Save Title'}
          </button>
        </form>
      )}

      {activeTest === 'caption' && (
        <form onSubmit={testCaptionGeneration} className="form">
          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter the title..."
              required
            />
          </div>
          <div className="form-group">
            <label>Platform:</label>
            <select name="platform" value={formData.platform} onChange={handleInputChange}>
              <option value="general">General</option>
              <option value="twitter">Twitter</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="linkedin">LinkedIn</option>
              <option value="threads">Threads</option>
            </select>
          </div>
          <div className="form-group">
            <label>Tone:</label>
            <select name="tone" value={formData.tone} onChange={handleInputChange}>
              <option value="friendly">Friendly</option>
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="enthusiastic">Enthusiastic</option>
            </select>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="include_hashtags"
                checked={formData.include_hashtags}
                onChange={handleInputChange}
              />
              Include Hashtags
            </label>
          </div>
          <button type="submit" disabled={loading || !formData.username} className="submit-button">
            {loading ? 'Generating...' : 'Generate & Save Caption'}
          </button>
        </form>
      )}

      {activeTest === 'library' && (
        <div className="content-library">
          <h3>Generated Content Library</h3>
          {generatedContent.length === 0 ? (
            <p>No generated content found. Generate some content first!</p>
          ) : (
            <div className="content-list">
              {generatedContent.map((content) => (
                <div key={content.id} className="content-item">
                  <div className="content-header">
                    <span className="content-type">{content.content_type}</span>
                    <span className="content-date">{new Date(content.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="content-text">{content.content}</div>
                  <div className="content-metadata">
                    Platform: {content.metadata.platform} | 
                    Style: {content.metadata.style || content.metadata.tone}
                  </div>
                  <div className="content-actions">
                    <input
                      type="datetime-local"
                      id={`schedule-${content.id}`}
                      className="schedule-input"
                    />
                    <button
                      onClick={() => {
                        const dateInput = document.getElementById(`schedule-${content.id}`);
                        if (dateInput.value) {
                          scheduleContent(content.id, dateInput.value);
                        } else {
                          alert('Please select a date and time');
                        }
                      }}
                      className="schedule-button"
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {response && (
        <div className={`response ${response.success ? 'success' : 'error'}`}>
          <h3>Response:</h3>
          <pre>{response.data.choices[0].message.content || 'No content available'}</pre>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default AITester;