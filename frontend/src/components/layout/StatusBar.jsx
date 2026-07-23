import React, { useState, useEffect } from 'react';
import './StatusBar.css';

const StatusBar = () => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
      setCurrentDate(now.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="status-bar">
      <div className="status-bar-content">
        <span className="status-item weather">
          🌤️ 31°C Partly sunny
        </span>
        <span className="status-divider">|</span>
        <span className="status-item language">ENG | IN</span>
        <span className="status-divider">|</span>
        <span className="status-item time">{currentTime}</span>
        <span className="status-divider">|</span>
        <span className="status-item date">{currentDate}</span>
      </div>
    </div>
  );
};

export default StatusBar;