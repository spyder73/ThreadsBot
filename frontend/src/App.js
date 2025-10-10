import React, { useState } from 'react';
import './App.css';
import AccountManager from './components/AccountManager';
import QueueManager from './components/QueueManager';
import AITester from './components/AITester';
import UploadTester from './components/UploadTester';
import Generator from './components/Generator';
import ContentManager from './components/ContentManager';
import MonitorDashboard from './components/MonitorDashboard';

function App() {
  const [activeTab, setActiveTab] = useState('accounts');

  const tabs = [
    { id: 'accounts', label: 'Account Manager' },
    { id: 'queue', label: 'Queue Manager' },
    { id: 'ai', label: 'AI Tester' },
    { id: 'upload', label: 'Upload Tester' },
    { id: 'generator', label: 'Content Generator' },
    { id: 'content', label: 'Content Manager' },
    { id: 'monitor', label: 'Monitor Dashboard' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'accounts':
        return <AccountManager />;
      case 'queue':
        return <QueueManager />;
      case 'ai':
        return <AITester />;
      case 'upload':
        return <UploadTester />;
      default:
        return <AccountManager />;
      case 'generator':
        return <Generator />;
      case 'content':
        return <ContentManager />;
      case 'monitor':
        return <MonitorDashboard />;  
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Social Media Scheduler</h1>
        <nav className="tab-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="App-main">
        {renderTabContent()}
      </main>
    </div>
  );
}

export default App;