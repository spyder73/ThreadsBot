import React, { useState, useEffect } from 'react';
import { aiService, queueService, mediaService, generatorService } from '../services/apiService';
import FileUploadComponent from './FileUploadComponent';
import MediaShowcase from './MediaShowcase';

const Generator = () => {
  // Core state
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [mediaFiles, setMediaFiles] = useState({ images: [], videos: [] });
  const [loading, setLoading] = useState(false);
  const [mediaStats, setMediaStats] = useState({ images: 0, videos: 0, total_size: 0 });
  const [uploadProgress, setUploadProgress] = useState(false);
  const [pendingPosts, setPendingPosts] = useState(0);

  // Generation settings
  const [settings, setSettings] = useState({
    uploadsPerDay: 5,
    minimumDelay: 30, // minutes
    downtime: {
      start: '22:00',
      end: '08:00'
    },
    maxImagesPerPost: 1,
    maxVideosPerPost: 1,
    additionalPrompt: ''
  });

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Load media files when account changes
  useEffect(() => {
    if (selectedAccount) {
      loadMediaFiles();
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (selectedAccount) {
        checkPendingPosts();
    }
  }, [selectedAccount]);

  const checkPendingPosts = async () => {
    if (!selectedAccount) return;

    try {
        const result = await generatorService.checkPendingPosts(selectedAccount.username);
        if (result.success) {
            setPendingPosts(result.data.pending_posts);
        }
    } catch (error) {
        console.error('Failed to check pending posts:', error);
    }
};

  const loadAccounts = async (s) => {
    try {
      const result = await queueService.getAccounts();
      if (result.success) {
        setAccounts(result.data.accounts);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadMediaFiles = async () => {
    if (!selectedAccount) return;

    // This will be implemented in the next step
    console.log('Loading media files for:', selectedAccount?.username);

    try {
        const statsResult = await mediaService.getStats(selectedAccount.id);
        if (statsResult.success) {
            setMediaStats(statsResult.data.stats);
        }        

        const filesResult = await mediaService.getFiles(selectedAccount.id);
        if (filesResult.success) {
            const images = filesResult.data.files.filter(f => f.file_type === 'image');
            const videos = filesResult.data.files.filter(f => f.file_type === 'video');
            setMediaFiles( { images, videos })
        }
    } catch (error) {
        console.error('Failed to load media files:', error);
    }
  };

  const handleFileUpload = async (file, description) => {
    if (!selectedAccount) return;

    setUploadProgress(true);
    try {
        const result = await mediaService.uploadFile(selectedAccount.id, file, description);
        if (result.success) {
            await loadMediaFiles();
        }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploadProgress(false);
        }
  };

  const handleAccountChange = (e) => {
    const accountId = e.target.value;
    const account = accounts.find(acc => acc.id === accountId);
    setSelectedAccount(account);
  };

  const handleStartProgram = async () => {
    if (!selectedAccount) return;
    
    setLoading(true);
    try {
      const result = await startContentGeneration(3); // 3 days
      if (result.success) {
        alert(`Successfully generated ${result.postsCreated} posts for the next 3 days!`);
      } else {
        alert(`Generation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleOneDay = async () => {
    if (!selectedAccount) return;
    
    setLoading(true);
    try {
      const result = await startContentGeneration(1); // 1 day
      if (result.success) {
        alert(`Successfully generated ${result.postsCreated} posts for one more day!`);
      } else {
        alert(`Generation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startContentGeneration = async (days) => {
    // This will call our backend generation endpoint
    const generationData = {
      account_username: selectedAccount.username,
      days: days,
      settings: {
        uploads_per_day: settings.uploadsPerDay,
        minimum_delay: settings.minimumDelay,
        downtime: settings.downtime,
        max_images_per_post: settings.maxImagesPerPost,
        max_videos_per_post: settings.maxVideosPerPost,
        additional_prompt: settings.additionalPrompt
      }
    };

    try {
        const result = await generatorService.generateContent(generationData);
        return result;
    } catch (error) {
        console.error('Generation failed:', error);
        throw error;
    }
  };

  return (
    <div className="generator-container">
      <h2>Content Generator</h2>
      
      {/* Step 1: Account Selection */}
      <div className="generator-section">
        <h3>1. Select Account</h3>
        <div className="form-group">
          <label>Account:</label>
          <select 
            value={selectedAccount?.id || ''} 
            onChange={handleAccountChange}
            className="account-select"
          >
            <option value="">Select an account...</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.username} ({account.platforms.join(', ')})
                {account.context_file && ` - ${account.context_file}`}
              </option>
            ))}
          </select>
        </div>
        
        {selectedAccount && (
          <div className="account-info">
            <p><strong>Selected:</strong> {selectedAccount.username}</p>
            <p><strong>Platforms:</strong> {selectedAccount.platforms.join(', ')}</p>
            <p><strong>Context:</strong> {selectedAccount.context_file || 'None'}</p>
          </div>
        )}
      </div>

      {/* Placeholder for next steps */}
      {selectedAccount && (
        <>
          <div className="generator-section">
            <h3>2. LLM Selection</h3>
            <div className="llm-selection">
              <label className="radio-label">
                <input type="radio" name="llm" value="grok4fast" defaultChecked />
                Grok 4 Fast
              </label>
            </div>
          </div>

          <div className="generator-section">
            <h3>3. Media Files</h3>
            <div className="media-stats">
                <div className="stat-item">
                    <span className="stat-number">{mediaStats.images}</span>
                    <span className="stat-label">Images</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{mediaStats.videos}</span>
                    <span className="stat-label">Videos</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{(mediaStats.total_size / (1024 * 1024)).toFixed(1)} MB</span>
                    <span className="stat-label">Total Size</span>
                </div>
            </div>
          </div>

          <FileUploadComponent
            onUpload={handleFileUpload}
            loading={uploadProgress}
          />

          <MediaShowcase
            images={mediaFiles.images}
            videos={mediaFiles.videos}
            loading={loadMediaFiles}
          />

          <div className="generator-section">
            <h3>4. Generation Settings</h3>
            
            <div className="settings-grid">
              {/* Posts per day */}
              <div className="setting-group">
                <label>Posts per day:</label>
                <div className="number-input">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.uploadsPerDay}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      uploadsPerDay: parseInt(e.target.value) || 1
                    }))}
                  />
                  <span className="input-note">Next 3 days = {settings.uploadsPerDay * 3} posts</span>
                </div>
              </div>

              {/* Minimum delay */}
              <div className="setting-group">
                <label>Minimum delay between posts:</label>
                <div className="number-input">
                  <input
                    type="number"
                    min="15"
                    max="300"
                    value={settings.minimumDelay}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      minimumDelay: parseInt(e.target.value) || 15
                    }))}
                  />
                  <span className="input-note">minutes (+ random 0-95 min)</span>
                </div>
              </div>

              {/* Downtime */}
              <div className="setting-group">
                <label>Downtime (no posting):</label>
                <div className="time-range">
                  <input
                    type="time"
                    value={settings.downtime.start}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      downtime: { ...prev.downtime, start: e.target.value }
                    }))}
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={settings.downtime.end}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      downtime: { ...prev.downtime, end: e.target.value }
                    }))}
                  />
                </div>
              </div>

              {/* Max media per post */}
              <div className="setting-group">
                <label>Max images per post:</label>
                <select
                  value={settings.maxImagesPerPost}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    maxImagesPerPost: parseInt(e.target.value)
                  }))}
                >
                  <option value={0}>None</option>
                  <option value={1}>1 image</option>
                  <option value={2}>2 images</option>
                  <option value={3}>3 images</option>
                  <option value={4}>4 images</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Max videos per post:</label>
                <select
                  value={settings.maxVideosPerPost}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    maxVideosPerPost: parseInt(e.target.value)
                  }))}
                >
                  <option value={0}>None</option>
                  <option value={1}>1 video</option>
                </select>
              </div>
            </div>

            {/* Additional prompt */}
            <div className="setting-group full-width">
              <label>Additional prompt for this generation:</label>
              <textarea
                value={settings.additionalPrompt}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  additionalPrompt: e.target.value
                }))}
                placeholder="Add specific instructions for this generation session (e.g., 'Focus on winter themes', 'Include product mentions', etc.)"
                className="additional-prompt"
              />
              <span className="input-note">This will be added to the context for all generated posts</span>
            </div>

            {/* Settings preview */}
            <div className="settings-preview">
              <h4>Generation Preview:</h4>
              <ul>
                <li><strong>{settings.uploadsPerDay * 3}</strong> posts will be created for the next 3 days</li>
                <li>Posts will be <strong>{settings.minimumDelay}-{settings.minimumDelay + 95} minutes</strong> apart</li>
                <li>No posts between <strong>{settings.downtime.start} - {settings.downtime.end}</strong></li>
                <li>Posts may include up to <strong>{settings.maxImagesPerPost}</strong> images and <strong>{settings.maxVideosPerPost}</strong> videos</li>
                {settings.additionalPrompt && (
                  <li>Additional context: "<em>{settings.additionalPrompt.substring(0, 50)}{settings.additionalPrompt.length > 50 ? '...' : ''}</em>"</li>
                )}
              </ul>
            </div>
          </div>

          {/* Step 5: Start Program */}
          <div className="generator-section">
            <h3>5. Start Program</h3>
            
            <div className="start-program">
              {/* Validation checks */}
              <div className="validation-checks">
                <div className={`check-item ${selectedAccount ? 'valid' : 'invalid'}`}>
                  <span className="check-icon">{selectedAccount ? '✅' : '❌'}</span>
                  Account selected
                </div>
                
                <div className={`check-item ${mediaFiles.images.length > 0 || mediaFiles.videos.length > 0 ? 'valid' : 'warning'}`}>
                  <span className="check-icon">{mediaFiles.images.length > 0 || mediaFiles.videos.length > 0 ? '✅' : '⚠️'}</span>
                  Media files available ({mediaFiles.images.length + mediaFiles.videos.length} total)
                </div>
                
                <div className={`check-item ${selectedAccount?.context_file ? 'valid' : 'warning'}`}>
                  <span className="check-icon">{selectedAccount?.context_file ? '✅' : '⚠️'}</span>
                  Context file configured
                </div>

                <div className="check-item valid">
                  <span className="check-icon">✅</span>
                  Generation settings configured
                </div>

                <div className={`check-item ${pendingPosts <= 5 ? 'warning' : 'valid'}`}>
                  <span className="check-icon">{pendingPosts <= 5 ? '⚠️' : '✅'}</span>
                  {pendingPosts} pending posts in queue
                  {pendingPosts <= 5 && <span className="auto-generate-note"> - Will auto-generate soon</span>}
                </div>


              </div>

              {/* Action buttons */}
              <div className="action-buttons">
                <button
                  onClick={handleStartProgram}
                  disabled={!selectedAccount || loading}
                  className="start-button"
                >
                  {loading ? 'Generating Content...' : `Start Program (Generate ${settings.uploadsPerDay * 3} Posts)`}
                </button>
                
                <button
                  onClick={handleScheduleOneDay}
                  disabled={!selectedAccount || loading}
                  className="schedule-day-button"
                >
                  {loading ? 'Generating...' : `Schedule One More Day (${settings.uploadsPerDay} Posts)`}
                </button>
              </div>

              {/* Status display */}
              {loading && (
                <div className="generation-status">
                  <div className="status-spinner">🔄</div>
                  <p>Generating content using {selectedAccount?.context_file || 'default context'}...</p>
                  <p>This may take a few minutes for {settings.uploadsPerDay * 3} posts</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Generator;