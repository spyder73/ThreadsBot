import React, { useState, useEffect } from 'react';
import { queueService } from '../services/apiService';

const AccountManager = () => {
  const [formData, setFormData] = useState({
    username: '',
    platforms: [],
    context_file: '',
  });
  const [contexts, setContexts] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const platformOptions = ['twitter', 'instagram', 'tiktok', 'facebook', 'linkedin', 'threads'];

  useEffect(() => {
    loadContexts();
  }, []);

  const loadContexts = async () => {
    const result = await queueService.getContexts();
    if (result.success) {
      setContexts(result.data.contexts);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlatformChange = (platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await queueService.createAccount(formData);
    setResponse(result);
    setLoading(false);
    
    if (result.success) {
      setFormData({ username: '', platforms: [], context_file: '' });
    }
  };

  return (
    <div className="component-container">
      <h2>Account Manager</h2>
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Platforms:</label>
          <div className="checkbox-group">
            {platformOptions.map(platform => (
              <label key={platform} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.platforms.includes(platform)}
                  onChange={() => handlePlatformChange(platform)}
                />
                {platform}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Context File:</label>
          <select
            name="context_file"
            value={formData.context_file}
            onChange={handleInputChange}
          >
            <option value="">Select context file (optional)</option>
            {contexts.map(context => (
              <option key={context} value={context}>{context}</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Creating...' : 'Create Account'}
        </button>
      </form>

      {response && (
        <div className={`response ${response.success ? 'success' : 'error'}`}>
          <h3>Response:</h3>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default AccountManager;