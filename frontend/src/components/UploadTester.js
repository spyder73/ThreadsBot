import React, { useState } from 'react';
import { uploadService } from '../services/apiService';

const UploadTester = () => {
  const [activeTest, setActiveTest] = useState('text');
  const [formData, setFormData] = useState({
    title: '',
    user: '',
    platforms: [],
    video_path: '',
    photos: [''],
    scheduled_date: '',
  });
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const platformOptions = ['twitter', 'instagram', 'tiktok', 'facebook', 'linkedin', 'threads'];

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

  const handlePhotoChange = (index, value) => {
    const newPhotos = [...formData.photos];
    newPhotos[index] = value;
    setFormData(prev => ({ ...prev, photos: newPhotos }));
  };

  const addPhoto = () => {
    setFormData(prev => ({ ...prev, photos: [...prev.photos, ''] }));
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const testText = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await uploadService.scheduleText({
      title: formData.title,
      user: formData.user,
      platforms: formData.platforms,
      ...(formData.scheduled_date && { scheduled_date: formData.scheduled_date }),
    });
    setResponse(result);
    setLoading(false);
  };

  const testVideo = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await uploadService.scheduleVideo({
      video_path: formData.video_path,
      title: formData.title,
      user: formData.user,
      platforms: formData.platforms,
      ...(formData.scheduled_date && { scheduled_date: formData.scheduled_date }),
    });
    setResponse(result);
    setLoading(false);
  };

  const testPhoto = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await uploadService.schedulePhoto({
      photos: formData.photos.filter(photo => photo.trim()),
      title: formData.title,
      user: formData.user,
      platforms: formData.platforms,
      ...(formData.scheduled_date && { scheduled_date: formData.scheduled_date }),
    });
    setResponse(result);
    setLoading(false);
  };

  const testConnection = async () => {
    setLoading(true);
    const result = await uploadService.test();
    setResponse(result);
    setLoading(false);
  };

  return (
    <div className="component-container">
      <h2>Upload Tester</h2>

      <div className="test-selector">
        <button
          className={activeTest === 'text' ? 'active' : ''}
          onClick={() => setActiveTest('text')}
        >
          Text Post
        </button>
        <button
          className={activeTest === 'video' ? 'active' : ''}
          onClick={() => setActiveTest('video')}
        >
          Video Post
        </button>
        <button
          className={activeTest === 'photo' ? 'active' : ''}
          onClick={() => setActiveTest('photo')}
        >
          Photo Post
        </button>
        <button onClick={testConnection} disabled={loading} className="test-connection">
          Test Connection
        </button>
      </div>

      <form
        onSubmit={
          activeTest === 'text' ? testText :
          activeTest === 'video' ? testVideo : testPhoto
        }
        className="form"
      >
        <div className="form-group">
          <label>Title:</label>
          <textarea
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter post title/content..."
            required
          />
        </div>

        <div className="form-group">
          <label>User:</label>
          <input
            type="text"
            name="user"
            value={formData.user}
            onChange={handleInputChange}
            placeholder="Username for upload service"
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

        {activeTest === 'video' && (
          <div className="form-group">
            <label>Video Path:</label>
            <input
              type="text"
              name="video_path"
              value={formData.video_path}
              onChange={handleInputChange}
              placeholder="/path/to/video.mp4"
              required
            />
          </div>
        )}

        {activeTest === 'photo' && (
          <div className="form-group">
            <label>Photo Paths:</label>
            {formData.photos.map((photo, index) => (
              <div key={index} className="photo-input">
                <input
                  type="text"
                  value={photo}
                  onChange={(e) => handlePhotoChange(index, e.target.value)}
                  placeholder={`/path/to/photo${index + 1}.jpg`}
                />
                {formData.photos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="remove-button"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addPhoto} className="add-button">
              Add Photo
            </button>
          </div>
        )}

        <div className="form-group">
          <label>Scheduled Date (optional):</label>
          <input
            type="datetime-local"
            name="scheduled_date"
            value={formData.scheduled_date}
            onChange={handleInputChange}
          />
        </div>

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Scheduling...' : `Schedule ${activeTest.charAt(0).toUpperCase() + activeTest.slice(1)}`}
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

export default UploadTester;