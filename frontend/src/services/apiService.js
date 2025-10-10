import { get, post, apiRequest } from '../utils/api';

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
};

export const uploadService = {
  scheduleVideo: (videoData) => post('/schedule-video', videoData),
  schedulePhoto: (photoData) => post('/schedule-photo', photoData),
  scheduleText: (textData) => post('/schedule-text', textData),
  test: () => get('/test'),
};

export const aiService = {
  grok4Fast: (promptData) => post('/ai/grok4_fast', promptData),
  generateTitle: (titleData) => post('/ai/generate_title', titleData),
  generateCaption: (captionData) => post('/ai/generate_caption', captionData),
};

export const mediaService = {
    uploadFile: (accountId, file, description) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('account_id', accountId);
        formData.append('description', description);

        return apiRequest('POST', '/media/upload', formData ,{
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
    generateContent: (generationData) => post('generator/generate-content', generationData),
    checkPendingPosts: (username = null) =>
        get('/generator/check-pending-posts', username ? { username } : null),
    autoGenerateCheck: (accountUsername) =>
        post('/generator/auto-generate-check', { account_username: accountUsername}),
}

export const monitorService = {
  startMonitor: () => post('/monitor/start'),
  stopMonitor: () => post('/monitor/stop'),
  getStatus: () => get('/monitor/status'),
  getAccountStatus: () => get('/monitor/accounts'),
  getLogs: () => get('/monitor/logs'),
  forceCheck: () => post('/monitor/force-check'),
};

// Add the missing HTTP methods if they don't exist:
const put = (endpoint, data = null, params = null) => 
  apiRequest('PUT', endpoint, data, {}, params);

const del = (endpoint, params = null) => 
  apiRequest('DELETE', endpoint, null, {}, params);
