import React, { useState, useEffect } from 'react';
import { queueService, generatorService } from '../services/apiService';

  // Add this helper function at the top of the file:
const parsePlatforms = (platforms) => {
    try {
      if (typeof platforms === 'string') {
        // Try to parse as JSON first
        const parsed = JSON.parse(platforms);
        return Array.isArray(parsed) ? parsed.join(', ') : platforms;
      }
      // If it's already an array
      return Array.isArray(platforms) ? platforms.join(', ') : platforms;
    } catch {
      // If parsing fails, return as-is
      return platforms;
    }
};

const ContentManager = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, scheduled, processing, uploaded
  const [sortBy, setSortBy] = useState('scheduled_date'); // scheduled_date, created_at

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadPosts();
    }
  }, [selectedAccount, filterStatus, sortBy]);

  const loadAccounts = async () => {
    try {
      const result = await queueService.getAccounts();
      if (result.success) {
        setAccounts(result.data.accounts);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadPosts = async () => {
    if (!selectedAccount) return;
    
    setLoading(true);
    try {
      const result = await queueService.getQueue(selectedAccount.username);
      if (result.success) {
        let filteredPosts = result.data.posts;
        
        // Filter by status
        if (filterStatus !== 'all') {
          filteredPosts = filteredPosts.filter(post => post.status === filterStatus);
        }
        
        // Sort posts
        filteredPosts.sort((a, b) => {
          if (sortBy === 'scheduled_date') {
            return new Date(a.scheduled_date) - new Date(b.scheduled_date);
          } else {
            return new Date(b.created_at) - new Date(a.created_at);
          }
        });
        
        setPosts(filteredPosts);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPost = (post) => {
    setEditingPost({
      ...post,
      editedContent: post.content,
      editedScheduledDate: post.scheduled_date.slice(0, 16) // Format for datetime-local
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    
    try {
      // This would be a new API endpoint for updating posts
      const result = await queueService.updatePost(editingPost.id, {
        content: editingPost.editedContent,
        scheduled_date: editingPost.editedScheduledDate
      });
      
      if (result.success) {
        setEditingPost(null);
        loadPosts(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to update post:', error);
      alert('Failed to update post');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }
    
    try {
      const result = await queueService.deletePost(postId);
      if (result.success) {
        loadPosts(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return '#007bff';
      case 'processing': return '#ffc107';
      case 'uploaded': return '#28a745';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const isPostEditable = (post) => {
    return post.status === 'scheduled' && new Date(post.scheduled_date) > new Date();
  };

  return (
    <div className="content-manager">
      <h2>Content Manager</h2>
      
      {/* Account Selection & Filters */}
      <div className="manager-controls">
        <div className="control-group">
          <label>Account:</label>
          <select 
            value={selectedAccount?.id || ''} 
            onChange={(e) => {
              const account = accounts.find(acc => acc.id === e.target.value);
              setSelectedAccount(account);
            }}
          >
            <option value="">Select an account...</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.username}
              </option>
            ))}
          </select>
        </div>

        {selectedAccount && (
          <>
            <div className="control-group">
              <label>Filter:</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Posts</option>
                <option value="scheduled">Scheduled</option>
                <option value="processing">Processing</option>
                <option value="uploaded">Uploaded</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="control-group">
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="scheduled_date">Scheduled Date</option>
                <option value="created_at">Created Date</option>
              </select>
            </div>

            <button onClick={loadPosts} className="refresh-button">
              🔄 Refresh
            </button>
          </>
        )}
      </div>

      {/* Posts List */}
      {selectedAccount && (
        <div className="posts-container">
          {loading ? (
            <div className="loading">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <p>No posts found for the selected filters.</p>
              <p>Generate some content first!</p>
            </div>
          ) : (
            <div className="posts-grid">
              {posts.map(post => (
                <PostCard 
                  key={post.id}
                  post={post}
                  onEdit={() => handleEditPost(post)}
                  onDelete={() => handleDeletePost(post.id)}
                  isEditable={isPostEditable(post)}
                  getStatusColor={getStatusColor}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingPost && (
        <EditPostModal 
          post={editingPost}
          onSave={handleSaveEdit}
          onCancel={() => setEditingPost(null)}
          onChange={(field, value) => setEditingPost(prev => ({
            ...prev,
            [field]: value
          }))}
        />
      )}
    </div>
  );
};

// PostCard Component
const PostCard = ({ post, onEdit, onDelete, isEditable, getStatusColor, formatDate }) => {
  const isUpcoming = new Date(post.scheduled_date) > new Date();
  
  return (
    <div className={`post-card ${post.status}`}>
      <div className="post-header">
        <div className="post-status" style={{ backgroundColor: getStatusColor(post.status) }}>
          {post.status.toUpperCase()}
        </div>
        <div className="post-platforms">
          {parsePlatforms(post.platforms)}
        </div>
      </div>

      <div className="post-content">
        <p>{post.content.length > 150 ? post.content.substring(0, 147) + '...' : post.content}</p>
      </div>

      <div className="post-details">
        <div className="post-date">
          <strong>Scheduled:</strong> {formatDate(post.scheduled_date)}
          {isUpcoming && <span className="upcoming-indicator">📅</span>}
        </div>
        <div className="post-created">
          <strong>Created:</strong> {formatDate(post.created_at)}
        </div>
      </div>

      <div className="post-actions">
        {isEditable && (
          <button onClick={onEdit} className="edit-button">
            ✏️ Edit
          </button>
        )}
        
        <button onClick={onDelete} className="delete-button">
          🗑️ Delete
        </button>
        
        <button 
          onClick={() => alert('View full content:\n\n' + post.content)} 
          className="view-button"
        >
          👁️ View Full
        </button>
      </div>
    </div>
  );
};

// EditPostModal Component
const EditPostModal = ({ post, onSave, onCancel, onChange }) => {
  return (
    <div className="modal-overlay">
      <div className="edit-modal">
        <div className="modal-header">
          <h3>Edit Post</h3>
          <button onClick={onCancel} className="close-button">✕</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Content:</label>
            <textarea
              value={post.editedContent}
              onChange={(e) => onChange('editedContent', e.target.value)}
              className="content-editor"
              rows={8}
            />
            <div className="character-count">
              {post.editedContent.length} characters
            </div>
          </div>

          <div className="form-group">
            <label>Scheduled Date & Time:</label>
            <input
              type="datetime-local"
              value={post.editedScheduledDate}
              onChange={(e) => onChange('editedScheduledDate', e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="datetime-input"
            />
          </div>

          <div className="post-info">
            <p><strong>Platforms:</strong> {parsePlatforms(post.platforms)}</p>
            <p><strong>Original Date:</strong> {new Date(post.scheduled_date).toLocaleString()}</p>
            <p><strong>Status:</strong> {post.status}</p>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onCancel} className="cancel-button">
            Cancel
          </button>
          <button onClick={onSave} className="save-button">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentManager;