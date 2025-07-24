import React, { useState, useRef, useEffect } from 'react';
import { Heart, Eye, UserPlus, TestTube, Play, Square, RotateCcw } from 'lucide-react';
import './App.css';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  response?: any;
}

interface TikTokCookies {
  sid_tt: string;
  msToken: string;
  csrf_token: string;
  sessionid: string;
  tt_webid: string;
}

const App: React.FC = () => {
  const [cookies, setCookies] = useState<TikTokCookies>({
    sid_tt: '',
    msToken: '',
    csrf_token: '',
    sessionid: '',
    tt_webid: ''
  });
  
  const [videoId, setVideoId] = useState('');
  const [userId, setUserId] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLooping, setIsLooping] = useState(false);
  const [loopInterval, setLoopInterval] = useState(5);
  const [selectedAction, setSelectedAction] = useState<'like' | 'view' | 'follow'>('like');
  
  const loopIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry['type'], message: string, response?: any) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      response
    };
    
    setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep only last 100 logs
  };

  const buildHeaders = () => {
    const cookieString = Object.entries(cookies)
      .filter(([_, value]) => value.trim() !== '')
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    return {
      'User-Agent': 'com.ss.android.ugc.trill/494+Mozilla/5.0+(Linux;+Android+12;+SM-G991B)+AppleWebKit/537.36+(KHTML,+like+Gecko)+Chrome/91.0.4472.120+Mobile+Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/json',
      'Cookie': cookieString,
      'Referer': 'https://www.tiktok.com/',
      'Origin': 'https://www.tiktok.com',
      'X-Requested-With': 'XMLHttpRequest',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site'
    };
  };

  const likeVideo = async () => {
    if (!videoId.trim()) {
      addLog('error', 'Video ID is required for liking');
      return;
    }

    try {
      addLog('info', `Attempting to like video: ${videoId}`);
      
      const response = await fetch(`https://api.tiktokv.com/aweme/v1/commit/item/digg/`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          aweme_id: videoId,
          type: 1, // 1 for like, 0 for unlike
          channel_id: 3
        })
      });

      const data = await response.json();
      
      if (response.ok && data.status_code === 0) {
        addLog('success', `Successfully liked video ${videoId}`, data);
      } else {
        addLog('error', `Failed to like video: ${data.status_msg || 'Unknown error'}`, data);
      }
    } catch (error) {
      addLog('error', `Network error while liking video: ${error}`, error);
    }
  };

  const pumpViews = async () => {
    if (!videoId.trim()) {
      addLog('error', 'Video ID is required for view pumping');
      return;
    }

    try {
      addLog('info', `Pumping views for video: ${videoId}`);
      
      const response = await fetch(`https://api.tiktokv.com/aweme/v1/aweme/stats/`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          aweme_id: videoId,
          play_delta: 1
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        addLog('success', `View registered for video ${videoId}`, data);
      } else {
        addLog('error', `Failed to register view: ${data.status_msg || 'Unknown error'}`, data);
      }
    } catch (error) {
      addLog('error', `Network error while pumping views: ${error}`, error);
    }
  };

  const followUser = async () => {
    if (!userId.trim()) {
      addLog('error', 'User ID is required for following');
      return;
    }

    try {
      addLog('info', `Attempting to follow user: ${userId}`);
      
      const response = await fetch(`https://api.tiktokv.com/aweme/v1/commit/follow/user/`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          user_id: userId,
          type: 1, // 1 for follow, 0 for unfollow
          from: 19
        })
      });

      const data = await response.json();
      
      if (response.ok && data.status_code === 0) {
        addLog('success', `Successfully followed user ${userId}`, data);
      } else {
        addLog('error', `Failed to follow user: ${data.status_msg || 'Unknown error'}`, data);
      }
    } catch (error) {
      addLog('error', `Network error while following user: ${error}`, error);
    }
  };

  const testAPI = async () => {
    try {
      addLog('info', 'Testing API connection...');
      
      const response = await fetch('https://api.tiktokv.com/aweme/v1/user/profile/self/', {
        method: 'GET',
        headers: buildHeaders()
      });

      const data = await response.json();
      
      if (response.ok) {
        addLog('success', 'API test successful - Connection established', data);
      } else {
        addLog('warning', `API test returned status ${response.status}`, data);
      }
    } catch (error) {
      addLog('error', `API test failed: ${error}`, error);
    }
  };

  const executeSelectedAction = async () => {
    switch (selectedAction) {
      case 'like':
        await likeVideo();
        break;
      case 'view':
        await pumpViews();
        break;
      case 'follow':
        await followUser();
        break;
    }
  };

  const startLoop = () => {
    if (loopIntervalRef.current) return;
    
    setIsLooping(true);
    addLog('info', `Started loop: ${selectedAction} every ${loopInterval} seconds`);
    
    loopIntervalRef.current = setInterval(executeSelectedAction, loopInterval * 1000);
  };

  const stopLoop = () => {
    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
    setIsLooping(false);
    addLog('info', 'Loop stopped');
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Logs cleared');
  };

  useEffect(() => {
    return () => {
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🤖 TikTok Bot Control Panel</h1>
        <p>Developer Dashboard for TikTok API Operations</p>
      </header>

      <div className="dashboard-content">
        <div className="control-panel">
          {/* Cookie Configuration */}
          <section className="config-section">
            <h2>🍪 Cookie Configuration</h2>
            <div className="cookie-grid">
              {Object.entries(cookies).map(([key, value]) => (
                <div key={key} className="input-group">
                  <label>{key}:</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setCookies(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Enter ${key}`}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Target Configuration */}
          <section className="config-section">
            <h2>🎯 Target Configuration</h2>
            <div className="target-grid">
              <div className="input-group">
                <label>Video ID:</label>
                <input
                  type="text"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                  placeholder="Enter TikTok Video ID"
                />
              </div>
              <div className="input-group">
                <label>User ID:</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter TikTok User ID"
                />
              </div>
            </div>
          </section>

          {/* Action Controls */}
          <section className="config-section">
            <h2>⚡ Action Controls</h2>
            <div className="action-buttons">
              <button onClick={likeVideo} className="action-btn like-btn">
                <Heart size={20} />
                Like Video
              </button>
              <button onClick={pumpViews} className="action-btn view-btn">
                <Eye size={20} />
                Pump Views
              </button>
              <button onClick={followUser} className="action-btn follow-btn">
                <UserPlus size={20} />
                Follow User
              </button>
              <button onClick={testAPI} className="action-btn test-btn">
                <TestTube size={20} />
                Test API
              </button>
            </div>
          </section>

          {/* Loop Controls */}
          <section className="config-section">
            <h2>🔄 Loop Controls</h2>
            <div className="loop-controls">
              <div className="loop-config">
                <label>Action:</label>
                <select 
                  value={selectedAction} 
                  onChange={(e) => setSelectedAction(e.target.value as any)}
                >
                  <option value="like">Like Video</option>
                  <option value="view">Pump Views</option>
                  <option value="follow">Follow User</option>
                </select>
                
                <label>Interval (seconds):</label>
                <input
                  type="number"
                  value={loopInterval}
                  onChange={(e) => setLoopInterval(Number(e.target.value))}
                  min="1"
                  max="3600"
                />
              </div>
              
              <div className="loop-buttons">
                {!isLooping ? (
                  <button onClick={startLoop} className="loop-btn start-btn">
                    <Play size={16} />
                    Start Loop
                  </button>
                ) : (
                  <button onClick={stopLoop} className="loop-btn stop-btn">
                    <Square size={16} />
                    Stop Loop
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Log Console */}
        <section className="log-section">
          <div className="log-header">
            <h2>📋 Console Logs</h2>
            <button onClick={clearLogs} className="clear-btn">
              <RotateCcw size={16} />
              Clear Logs
            </button>
          </div>
          
          <div className="log-container" ref={logContainerRef}>
            {logs.length === 0 ? (
              <div className="log-empty">No logs yet. Start performing actions to see results here.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`log-entry log-${log.type}`}>
                  <div className="log-meta">
                    <span className="log-time">{log.timestamp}</span>
                    <span className={`log-type log-type-${log.type}`}>
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="log-message">{log.message}</div>
                  {log.response && (
                    <details className="log-response">
                      <summary>Response Data</summary>
                      <pre>{JSON.stringify(log.response, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;