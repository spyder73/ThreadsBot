import React, { useState, useEffect } from 'react';
import { personalityService } from '../services/apiService';
import '../QualityControl.css';

const QualityControl = ({ 
  contextFile, 
  response = null, 
  prompt = null, 
  model = null,
  onQualityAssessed = null,
  mode = 'inline' // 'inline' for AITester, 'dragdrop' for ContentManager
}) => {
  const [goodResponses, setGoodResponses] = useState([]);
  const [badResponses, setBadResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropZones, setShowDropZones] = useState(false);

  const handleQualityAssessment = async (quality, content = null, additionalData = {}) => {
    if (!contextFile) {
      alert('No context file selected for quality assessment');
      return;
    }

    try {
      setLoading(true);
      
      const assessmentData = {
        context_file: contextFile,
        quality: quality, // 'good' or 'bad'
        content: content || response,
        prompt: prompt,
        model: model,
        timestamp: new Date().toISOString(),
        ...additionalData
      };

      const result = await personalityService.addQualityExample(assessmentData);
      
      if (result.success) {
        // Update local state
        if (quality === 'good') {
          setGoodResponses(prev => [...prev, assessmentData]);
        } else {
          setBadResponses(prev => [...prev, assessmentData]);
        }
        
        // Callback for parent component
        if (onQualityAssessed) {
          onQualityAssessed(quality, assessmentData);
        }
        
        alert(`✅ Response marked as ${quality} and added to context examples`);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error assessing quality:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = async (e, quality) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    try {
      const postData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      await handleQualityAssessment(quality, postData.content, {
        post_id: postData.id,
        account: postData.account || postData.username || postData.account_username,
        scheduled_date: postData.scheduled_date,
        platforms: postData.platforms
      });
      
    } catch (error) {
      console.error('Error handling drop:', error);
      alert('Error processing dropped content');
    }
  };

  if (mode === 'inline') {
    // Inline mode for AITester
    return (
      <div className="quality-control-inline">
        {response && (
          <div className="quality-assessment">
            <h4>📊 Assess Response Quality</h4>
            <p>Rate this response to improve the context:</p>
            <div className="quality-buttons">
              <button
                onClick={() => handleQualityAssessment('good')}
                disabled={loading || !contextFile}
                className="quality-btn good"
                title={!contextFile ? "Select a context file first" : "Mark as good example"}
              >
                👍 Good Example
              </button>
              <button
                onClick={() => handleQualityAssessment('bad')}
                disabled={loading || !contextFile}
                className="quality-btn bad"
                title={!contextFile ? "Select a context file first" : "Mark as bad example"}
              >
                👎 Bad Example
              </button>
            </div>
            {!contextFile && (
              <p className="context-warning">⚠️ Select a context file to enable quality assessment</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Drag & Drop mode for ContentManager
  return (
    <div className="quality-control-dragdrop">
      <div className="quality-header">
        <h3>📊 Content Quality Assessment</h3>
        <button 
          onClick={() => setShowDropZones(!showDropZones)}
          className="toggle-zones-btn"
        >
          {showDropZones ? '🙈 Hide Drop Zones' : '👁️ Show Drop Zones'}
        </button>
      </div>
      
      {showDropZones && (
        <div className="drop-zones">
          <div
            className="drop-zone good-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'good')}
          >
            <div className="drop-zone-content">
              <span className="drop-icon">👍</span>
              <h4>Good Examples</h4>
              <p>Drag posts here to mark as good examples</p>
              <p className="drop-hint">Content will remain scheduled</p>
            </div>
          </div>
          
          <div
            className="drop-zone bad-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'bad')}
          >
            <div className="drop-zone-content">
              <span className="drop-icon">👎</span>
              <h4>Bad Examples</h4>
              <p>Drag posts here to mark as bad examples</p>
              <p className="drop-hint">⚠️ Content will be deleted from schedule</p>
            </div>
          </div>
        </div>
      )}
      
      {(goodResponses.length > 0 || badResponses.length > 0) && (
        <div className="quality-summary">
          <h4>Recent Assessments:</h4>
          <div className="assessment-stats">
            <span className="good-count">👍 {goodResponses.length} Good</span>
            <span className="bad-count">👎 {badResponses.length} Bad</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityControl;
