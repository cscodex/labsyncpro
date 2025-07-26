// @ts-nocheck
import { useEffect } from 'react';

const KeepAlive: React.FC = () => {
  useEffect(() => {
    const keepAlive = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '/health') || 'https://labsyncpro.onrender.com/health';
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔄 Keep-alive ping successful:', data.timestamp);
        } else {
          console.warn('⚠️ Keep-alive ping failed:', response.status);
        }
      } catch (error) {
        console.warn('⚠️ Keep-alive error:', error.message);
      }
    };

    // Ping immediately
    keepAlive();

    // Then ping every 10 minutes (600,000 ms)
    const interval = setInterval(keepAlive, 10 * 60 * 1000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  // This component doesn't render anything
  return null;
};

export default KeepAlive;
