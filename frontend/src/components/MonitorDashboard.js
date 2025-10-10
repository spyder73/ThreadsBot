import React, { useState, useEffect } from 'react';
import { monitorService } from '../services/apiService';

const MonitorDashboard = () => {
  const [monitorStatus, setMonitorStatus] = useState(null);
  const [accountStatuses, setAccountStatuses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMonitorData();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadMonitorData, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadMonitorData = async () => {
    try {
      const [statusResult, accountsResult, logsResult] = await Promise.all([
        monitorService.getStatus(),
        monitorService.getAccountStatus(),
        monitorService.getLogs()
      ]);

      if (statusResult.success) {
        setMonitorStatus(statusResult.data.status);
      }

      if (accountsResult.success) {
        setAccountStatuses(accountsResult.data.accounts);
      }

      if (logsResult.success) {
        setLogs(logsResult.data.logs);
      }
    } catch (error) {
      console.error('Failed to load monitor data:', error);
    }
  };

  const handleStartMonitor = async () => {
    setLoading(true);
    try {
      const result = await monitorService.startMonitor();
      if (result.success) {
        await loadMonitorData();
      }
    } catch (error) {
      console.error('Failed to start monitor:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStopMonitor = async () => {
    setLoading(true);
    try {
      const result = await monitorService.stopMonitor();
      if (result.success) {
        await loadMonitorData();
      }
    } catch (error) {
      console.error('Failed to stop monitor:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceCheck = async () => {
    setLoading(true);
    try {
      const result = await monitorService.forceCheck();
      if (result.success) {
        alert(`Force check completed: ${result.data.message}`);
        await loadMonitorData();
      }
    } catch (error) {
      console.error('Failed to force check:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLastCheck = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    return date.toLocaleString();
  };

  return (
    <div className="monitor-dashboard">
      <div className="dashboard-header">
        <h2>Auto-Generation Monitor</h2>
        <div className="dashboard-controls">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <button onClick={loadMonitorData} className="refresh-button">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Monitor Status Panel */}
      <div className="status-panel">
        <h3>Monitor Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Status:</span>
            <span className={`status-value ${monitorStatus?.is_running ? 'running' : 'stopped'}`}>
              {monitorStatus?.is_running ? '🟢 Running' : '🔴 Stopped'}
            </span>
          </div>
          
          <div className="status-item">
            <span className="status-label">Last Check:</span>
            <span className="status-value">
              {formatLastCheck(monitorStatus?.last_check)}
            </span>
          </div>
          
          <div className="status-item">
            <span className="status-label">Check Interval:</span>
            <span className="status-value">
              {monitorStatus?.check_interval ? `${monitorStatus.check_interval / 60} minutes` : 'N/A'}
            </span>
          </div>
          
          <div className="status-item">
            <span className="status-label">Total Logs:</span>
            <span className="status-value">
              {monitorStatus?.total_logs || 0}
            </span>
          </div>
        </div>

        <div className="monitor-actions">
          {!monitorStatus?.is_running ? (
            <button 
              onClick={handleStartMonitor} 
              disabled={loading}
              className="start-monitor-button"
            >
              {loading ? 'Starting...' : '▶️ Start Monitor'}
            </button>
          ) : (
            <button 
              onClick={handleStopMonitor} 
              disabled={loading}
              className="stop-monitor-button"
            >
              {loading ? 'Stopping...' : '⏹️ Stop Monitor'}
            </button>
          )}
          
          <button 
            onClick={handleForceCheck} 
            disabled={loading}
            className="force-check-button"
          >
            {loading ? 'Checking...' : '🔍 Force Check'}
          </button>
        </div>
      </div>

      {/* Account Status Grid */}
      <div className="accounts-panel">
        <h3>Account Status</h3>
        <div className="accounts-grid">
          {accountStatuses.map(account => (
            <AccountStatusCard key={account.username} account={account} />
          ))}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="logs-panel">
        <h3>Recent Activity</h3>
        <div className="logs-container">
          {logs.length === 0 ? (
            <div className="no-logs">No recent activity</div>
          ) : (
            logs.map((log, index) => (
              <LogEntry key={index} log={log} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Account Status Card Component
const AccountStatusCard = ({ account }) => {
  const getStatusClass = () => {
    if (account.needs_generation) return 'needs-attention';
    if (account.pending_posts <= 10) return 'warning';
    return 'healthy';
  };

  const formatNextPost = (dateString) => {
    if (!dateString) return 'No posts scheduled';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((date - now) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Next post: Soon';
    if (diffHours < 24) return `Next post: ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Next post: ${diffDays}d ${diffHours % 24}h`;
  };

  return (
    <div className={`account-status-card ${getStatusClass()}`}>
      <div className="account-header">
        <h4>{account.username}</h4>
        <div className="platforms">
          {account.platforms.join(', ')}
        </div>
      </div>
      
      <div className="account-metrics">
        <div className="metric">
          <span className="metric-number">{account.pending_posts}</span>
          <span className="metric-label">Pending Posts</span>
        </div>
      </div>
      
      <div className="account-details">
        <div className="detail-item">
          <span>Context: {account.context_file || 'None'}</span>
        </div>
        <div className="detail-item">
          <span>{formatNextPost(account.next_post)}</span>
        </div>
        {account.needs_generation && (
          <div className="alert-badge">
            ⚠️ Needs Generation
          </div>
        )}
      </div>
    </div>
  );
};

// Log Entry Component
const LogEntry = ({ log }) => {
  const getLogIcon = () => {
    if (!log.success) return '❌';
    if (log.action === 'auto_generation') return '🤖';
    return '📝';
  };

  const getLogClass = () => {
    if (!log.success) return 'log-error';
    if (log.action === 'auto_generation') return 'log-generation';
    return 'log-info';
  };

  return (
    <div className={`log-entry ${getLogClass()}`}>
      <span className="log-icon">{getLogIcon()}</span>
      <div className="log-content">
        <div className="log-message">
          {log.success ? (
            `Generated ${log.posts_created} posts for ${log.account}`
          ) : (
            `Failed to generate for ${log.account}: ${log.error}`
          )}
        </div>
        <div className="log-timestamp">
          {new Date(log.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default MonitorDashboard;