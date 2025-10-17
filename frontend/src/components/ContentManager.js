import React, { useState, useEffect } from 'react';
import { queueService } from '../services/apiService';
import QualityControl from './QualityControl';
import '../ContentManager.css';

const ContentManager = () => {
  const [posts, setPosts] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStatuses, setDeleteStatuses] = useState([]);

  const statusTypes = [
    { key: 'all', label: 'All Posts', color: '#6b7280' },
    { key: 'scheduled', label: 'Scheduled', color: '#3b82f6' },
    { key: 'failed', label: 'Failed', color: '#ef4444' },
    { key: 'uploaded', label: 'Uploaded', color: '#10b981' },
    { key: 'pending', label: 'Pending', color: '#f59e0b' },
    { key: 'processing', label: 'Processing', color: '#8b5cf6' }
  ];

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const result = await queueService.getAllPosts();
      
      if (result.success) {
        setPosts(result.data.posts || []);
        
        // Extract unique accounts from the posts
        const uniqueAccounts = [...new Set(result.data.posts?.map(post => {
          // Try to get account from different possible field names
          return post.account || post.username || post.account_username || 'Unknown';
        }).filter(Boolean) || [])];
        setAccounts(uniqueAccounts);
      } else {
        console.error('Error loading posts:', result.error);
        setPosts([]);
        setAccounts([]);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const statusMatch = selectedStatus === 'all' || post.status === selectedStatus;
    const postAccount = post.account || post.username || post.account_username || 'Unknown';
    const accountMatch = selectedAccount === 'all' || postAccount === selectedAccount;
    return statusMatch && accountMatch;
  });

  const getStatusColor = (status) => {
    const statusType = statusTypes.find(s => s.key === status);
    return statusType ? statusType.color : '#6b7280';
  };

  const handleDeleteAll = async () => {
    if (deleteStatuses.length === 0) return;
    
    try {
      setLoading(true);
      const result = await queueService.deleteAllPosts(deleteStatuses);
      
      if (result.success) {
        await loadPosts();
        setShowDeleteModal(false);
        setDeleteStatuses([]);
      } else {
        console.error('Error deleting posts:', result.error);
        alert('Error deleting posts: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting posts:', error);
      alert('Error deleting posts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getPostCounts = () => {
    const counts = {};
    statusTypes.forEach(status => {
      if (status.key === 'all') {
        counts[status.key] = posts.length;
      } else {
        counts[status.key] = posts.filter(post => post.status === status.key).length;
      }
    });
    return counts;
  };

  const postCounts = getPostCounts();

  const handleDragStart = (e, post) => {
    e.dataTransfer.setData('application/json', JSON.stringify(post));
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  const handleQualityAssessed = async (quality, assessmentData) => {
    try {
      // If marked as bad, also delete from schedule
      if (quality === 'bad' && assessmentData.post_id) {
        const deleteResult = await queueService.deletePost(assessmentData.post_id);
        if (deleteResult.success) {
          // Remove from local state
          setPosts(prev => prev.filter(post => post.id !== assessmentData.post_id));
          console.log('Post deleted from schedule due to bad quality assessment');
        }
      }
      
      // Reload posts to reflect any changes
      await loadPosts();
      
    } catch (error) {
      console.error('Error handling quality assessment:', error);
    }
  };

  return (
    <div className="content-manager">
      <div className="content-manager-header">
        <h2>Content Manager</h2>
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={loadPosts}
            disabled={loading}
          >
            🔄 Refresh
          </button>
          <button 
            className="delete-all-btn"
            onClick={() => setShowDeleteModal(true)}
          >
            🗑️ Bulk Delete
          </button>
        </div>
      </div>

      {/* Quality Control Component */}
      <QualityControl
        mode="dragdrop"
        onQualityAssessed={handleQualityAssessed}
      />

      {/* Status Filter Cards */}
      <div className="status-filter-cards">
        {statusTypes.map(status => (
          <div
            key={status.key}
            className={`status-card ${selectedStatus === status.key ? 'active' : ''}`}
            onClick={() => setSelectedStatus(status.key)}
            style={{ '--status-color': status.color }}
          >
            <div className="status-label">{status.label}</div>
            <div className="status-count">{postCounts[status.key] || 0}</div>
          </div>
        ))}
      </div>

      {/* Account Filter */}
      <div className="account-filter">
        <label>Filter by Account:</label>
        <select 
          value={selectedAccount} 
          onChange={(e) => setSelectedAccount(e.target.value)}
        >
          <option value="all">All Accounts ({accounts.length})</option>
          {accounts.map(account => (
            <option key={account} value={account}>{account}</option>
          ))}
        </select>
      </div>

      {/* Posts Grid */}
      <div className="posts-grid">
        {loading ? (
          <div className="loading">Loading posts...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="no-posts">
            {posts.length === 0 ? 'No posts found in database' : `No posts match the current filter (${selectedStatus})`}
            <button onClick={loadPosts} className="retry-btn">🔄 Retry</button>
          </div>
        ) : (
          filteredPosts.map(post => {
            const postAccount = post.account || post.username || post.account_username || 'Unknown';
            return (
              <div 
                key={post.id} 
                className="post-card draggable"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, post)}
                onDragEnd={handleDragEnd}
              >
                <div 
                  className="post-status"
                  style={{ backgroundColor: getStatusColor(post.status) }}
                >
                  {post.status}
                </div>
                
                <div className="post-content">
                  <div className="post-title">{post.title || 'Generated Content'}</div>
                  <div className="post-text">
                    {post.content ? post.content.substring(0, 150) + '...' : 'No content preview'}
                  </div>
                  
                  <div className="post-meta">
                    <span className="post-account">📱 {postAccount}</span>
                    <span className="post-date">
                      {post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Unknown date'}
                    </span>
                  </div>
                  
                  {post.scheduled_date && (
                    <div className="post-scheduled">
                      ⏰ {new Date(post.scheduled_date).toLocaleString()}
                    </div>
                  )}

                  {post.platforms && (
                    <div className="post-platforms">
                      📡 {Array.isArray(post.platforms) ? post.platforms.join(', ') : post.platforms}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <h3>Bulk Delete Posts</h3>
            <p>Select which post types to delete:</p>
            
            <div className="delete-options">
              {statusTypes.filter(s => s.key !== 'all').map(status => (
                <label key={status.key} className="delete-option">
                  <input
                    type="checkbox"
                    checked={deleteStatuses.includes(status.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setDeleteStatuses([...deleteStatuses, status.key]);
                      } else {
                        setDeleteStatuses(deleteStatuses.filter(s => s !== status.key));
                      }
                    }}
                  />
                  <span style={{ color: status.color }}>
                    {status.label} ({postCounts[status.key] || 0})
                  </span>
                </label>
              ))}
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button 
                onClick={handleDeleteAll}
                disabled={deleteStatuses.length === 0}
                className="delete-confirm-btn"
              >
                Delete {deleteStatuses.length > 0 ? `(${deleteStatuses.reduce((sum, status) => sum + (postCounts[status] || 0), 0)} posts)` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentManager;