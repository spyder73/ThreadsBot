import React, { useState } from 'react';
import { mediaService } from '../services/apiService';

const MediaShowcase = ({ images, videos, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('images');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    setDeleteLoading(fileId);
    try {
      const result = await mediaService.deleteFile(fileId);
      if (result.success) {
        onRefresh(); // Refresh the media list
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete file');
    } finally {
      setDeleteLoading(null);
    }
  };

  const MediaCard = ({ file, type }) => (
    <div className="media-card" onClick={() => setSelectedMedia(file)}>
      <div className="media-thumbnail">
        {type === 'image' ? (
          <div className="image-placeholder">🖼️</div>
        ) : (
          <div className="video-placeholder">🎥</div>
        )}
      </div>
      
      <div className="media-info">
        <div className="media-filename" title={file.filename}>
          {file.filename.length > 20 ? 
            file.filename.substring(0, 17) + '...' : 
            file.filename
          }
        </div>
        <div className="media-description" title={file.description}>
          {file.description.length > 30 ? 
            file.description.substring(0, 27) + '...' : 
            file.description
          }
        </div>
        <div className="media-size">
          {(file.file_size / 1024 / 1024).toFixed(1)} MB
        </div>
      </div>

      <button
        className="delete-button"
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(file.id);
        }}
        disabled={deleteLoading === file.id}
      >
        {deleteLoading === file.id ? '...' : '🗑️'}
      </button>
    </div>
  );

  const MediaModal = () => {
    if (!selectedMedia) return null;

    return (
      <div className="media-modal" onClick={() => setSelectedMedia(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{selectedMedia.filename}</h3>
            <button 
              className="close-button"
              onClick={() => setSelectedMedia(null)}
            >
              ✕
            </button>
          </div>
          
          <div className="modal-body">
            <div className="media-preview">
              {selectedMedia.file_type === 'image' ? (
                <div className="image-preview-placeholder">
                  🖼️ Image Preview
                  <p>({selectedMedia.filename})</p>
                </div>
              ) : (
                <div className="video-preview-placeholder">
                  🎥 Video Preview
                  <p>({selectedMedia.filename})</p>
                </div>
              )}
            </div>
            
            <div className="media-details">
              <p><strong>Description:</strong> {selectedMedia.description}</p>
              <p><strong>Size:</strong> {(selectedMedia.file_size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>Uploaded:</strong> {new Date(selectedMedia.created_at).toLocaleDateString()}</p>
              <p><strong>Path:</strong> {selectedMedia.file_path}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="media-showcase">
      <div className="showcase-header">
        <h4>Media Library</h4>
        <div className="tab-controls">
          <button
            className={activeTab === 'images' ? 'active' : ''}
            onClick={() => setActiveTab('images')}
          >
            Images ({images.length})
          </button>
          <button
            className={activeTab === 'videos' ? 'active' : ''}
            onClick={() => setActiveTab('videos')}
          >
            Videos ({videos.length})
          </button>
        </div>
      </div>

      <div className="media-grid">
        {activeTab === 'images' && images.length === 0 && (
          <div className="empty-state">
            <p>No images uploaded yet</p>
            <p>Upload some images to get started</p>
          </div>
        )}

        {activeTab === 'videos' && videos.length === 0 && (
          <div className="empty-state">
            <p>No videos uploaded yet</p>
            <p>Upload some videos to get started</p>
          </div>
        )}

        {activeTab === 'images' && images.map(image => (
          <MediaCard key={image.id} file={image} type="image" />
        ))}

        {activeTab === 'videos' && videos.map(video => (
          <MediaCard key={video.id} file={video} type="video" />
        ))}
      </div>

      <MediaModal />
    </div>
  );
};

export default MediaShowcase;