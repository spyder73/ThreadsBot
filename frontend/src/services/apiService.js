import { get, post, put, del, apiRequest } from '../utils/api';

export const queueService = {
  createAccount: (accountData) => post('/queue/create-account', accountData),
  getAccounts: () => get('/queue/accounts'),
  generateAndSave: (contentData) => post('/queue/generate-and-save', contentData),
  getGeneratedContent: (username = null, contentType = null) => 
    get('/queue/generated-content', { ...(username && { username }), ...(contentType && { content_type: contentType }) }),
  scheduleGeneratedContent: (scheduleData) => post('/queue/schedule-generated-content', scheduleData),
  scheduleBatch: (batchData) => post('/queue/schedule-batch', batchData),
  getQueue: (username = null) => get('/queue/get-queue', username ? { username } : null),
  processQueue: () => post('/queue/process-queue', {}),
  getContexts: () => get('/queue/contexts'),
  updatePost: (postId, updateData) => put(`/queue/update-post/${postId}`, updateData),
  deletePost: (postId) => del(`/queue/delete-post/${postId}`),
  // Add the new queue management methods
  getAllPosts: () => get('/queue/posts'),
  deleteAllPosts: (statuses) => apiRequest('DELETE', '/queue/delete_all', { statuses }),
};

export const uploadService = {
  scheduleVideo: (videoData) => post('/schedule-video', videoData),
  schedulePhoto: (photoData) => post('/schedule-photo', photoData),
  scheduleText: (textData) => post('/schedule-text', textData),
  test: () => get('/test'),
};

export const aiService = {
  // Update to use the new openrouter endpoints
  grok4Fast: (promptData) => post('/ai/grok4_fast', promptData),
};

export const openrouterService = {
  getModels: () => get('/ai/models'),
  inference: (data) => post('/ai/inference', data),
  grok4Fast: (promptData) => post('/ai/grok4_fast', promptData),
};

export const mediaService = {
    uploadFile: (accountId, file, description) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('account_id', accountId);
        formData.append('description', description);

        return apiRequest('POST', '/media/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
        });
    },
    
    getFiles: (accountId, fileType = null) => 
        get(`/media/files/${accountId}`, fileType ? { type: fileType } : null),
    
    deleteFile: (fileId) => del(`/media/files/${fileId}`),

    getStats: (accountId) => get(`/media/stats/${accountId}`),
};

export const generatorService = {
    generateContent: (generationData) => post('/generator/generate-content', generationData),
    checkPendingPosts: (username = null) =>
        get('/generator/check-pending-posts', username ? { username } : null),
    autoGenerateCheck: (accountUsername) =>
        post('/generator/auto-generate-check', { account_username: accountUsername}),
};

export const monitorService = {
  startMonitor: () => post('/monitor/start'),
  stopMonitor: () => post('/monitor/stop'),
  getStatus: () => get('/monitor/status'),
  getAccountStatus: () => get('/monitor/accounts'),
  getLogs: () => get('/monitor/logs'),
  forceCheck: () => post('/monitor/force-check'),
};

export const personalityService = {
  createPersonality: (personalityData) => post('/personality/create', personalityData),
  getPersonalities: () => get('/personality/list'),
  loadPersonality: (filename) => get(`/personality/load/${filename}`),
  deletePersonality: (filename) => del(`/personality/${filename}`),
};



// Backward compatibility exports (use the service methods)
export const getModels = () => openrouterService.getModels();
export const inference = (data) => openrouterService.inference(data);
export const deleteAllPosts = (statuses) => queueService.deleteAllPosts(statuses);
export const getAllPosts = () => queueService.getAllPosts();
