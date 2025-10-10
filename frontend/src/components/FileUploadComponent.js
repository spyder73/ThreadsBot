import React, { useState } from 'react';

const FileUploadComponent = ({ onUpload, loading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (file) => {
    // Check file type
    const allowedTypes = [
      'image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image or video file');
      return;
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !description.trim()) {
      alert('Please select a file and add a description');
      return;
    }

    await onUpload(selectedFile, description);
    
    // Reset form
    setSelectedFile(null);
    setDescription('');
    setPreviewUrl(null);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setDescription('');
    setPreviewUrl(null);
  };

  return (
    <div className="file-upload-container">
      <h4>Upload Media Files</h4>
      
      {!selectedFile ? (
        <div
          className={`upload-dropzone ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <div className="upload-icon">📁</div>
          <p>Drag & drop files here or click to browse</p>
          <p className="upload-hint">Images: PNG, JPG, GIF, WebP | Videos: MP4, AVI, MOV, MKV, WebM</p>
          <input
            id="file-input"
            type="file"
            accept="image/*,video/*"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div className="file-selected">
          <div className="file-preview">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="preview-image" />
            ) : (
              <div className="video-placeholder">
                🎥 {selectedFile.name}
              </div>
            )}
          </div>
          
          <div className="file-details">
            <p><strong>File:</strong> {selectedFile.name}</p>
            <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <p><strong>Type:</strong> {selectedFile.type}</p>
          </div>

          <div className="form-group">
            <label>Description (required for AI context):</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this image/video for AI content generation..."
              className="description-input"
            />
          </div>

          <div className="upload-actions">
            <button onClick={clearSelection} className="clear-button">
              Clear
            </button>
            <button 
              onClick={handleUpload} 
              disabled={loading || !description.trim()}
              className="upload-button"
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadComponent;