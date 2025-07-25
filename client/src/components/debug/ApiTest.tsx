// @ts-nocheck
import React, { useState, useEffect } from 'react';

const ApiTest: React.FC = () => {
  const [apiStatus, setApiStatus] = useState('Testing...');
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    const testApi = async () => {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      setApiUrl(baseUrl);
      
      try {
        console.log('Testing API at:', baseUrl);
        
        // Test health endpoint
        const healthResponse = await fetch(baseUrl.replace('/api', '/health'));
        if (healthResponse.ok) {
          const healthData = await healthResponse.text();
          setApiStatus(`✅ API Health: ${healthData}`);
        } else {
          setApiStatus(`❌ Health check failed: ${healthResponse.status}`);
        }
      } catch (error) {
        console.error('API Test Error:', error);
        setApiStatus(`❌ API Error: ${error.message}`);
      }
    };

    testApi();
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '1px solid #ccc', 
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999,
      fontSize: '12px',
      maxWidth: '300px'
    }}>
      <h4>API Debug Info</h4>
      <p><strong>API URL:</strong> {apiUrl}</p>
      <p><strong>Status:</strong> {apiStatus}</p>
      <p><strong>Environment:</strong> {import.meta.env.MODE}</p>
    </div>
  );
};

export default ApiTest;
