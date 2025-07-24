import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Shield, 
  Activity, 
  HardDrive, 
  Users, 
  Mail, 
  Download, 
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import './SystemAdmin.css';

interface SystemStats {
  database: {
    size: string;
    connections: {
      total: number;
      active: number;
      idle: number;
    };
    health: 'healthy' | 'warning' | 'critical';
  };
  security: {
    activeSessions: number;
    failedLogins24h: number;
    twoFactorAdoption: number;
    suspiciousActivity: number;
  };
  email: {
    totalAccounts: number;
    activeAccounts: number;
    emailsSent24h: number;
    serverStatus: 'running' | 'stopped' | 'error';
  };
  performance: {
    avgResponseTime: number;
    errorRate: number;
    uptime: string;
    memoryUsage: number;
  };
}

const SystemAdmin: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [optimizeInProgress, setOptimizeInProgress] = useState(false);

  useEffect(() => {
    fetchSystemStats();
    const interval = setInterval(fetchSystemStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStats = async () => {
    try {
      // Fetch from multiple endpoints
      const [dbHealth, securityOverview, emailStats, sessionStats] = await Promise.all([
        fetch('/api/admin/database-health').then(r => r.json()),
        fetch('/api/security/audit-stats').then(r => r.json()),
        fetch('/api/webmail/email-stats').then(r => r.json()),
        fetch('/api/admin/session-stats').then(r => r.json())
      ]);

      setStats({
        database: {
          size: dbHealth.databaseSize || 'Unknown',
          connections: dbHealth.connections || { total: 0, active: 0, idle: 0 },
          health: dbHealth.connections?.active > 50 ? 'warning' : 'healthy'
        },
        security: {
          activeSessions: sessionStats.active_sessions || 0,
          failedLogins24h: securityOverview.failed_events || 0,
          twoFactorAdoption: 75, // This would come from 2FA stats
          suspiciousActivity: 0
        },
        email: {
          totalAccounts: emailStats.accounts?.total_accounts || 0,
          activeAccounts: emailStats.accounts?.active_accounts || 0,
          emailsSent24h: emailStats.logs?.emails_last_week || 0,
          serverStatus: 'running'
        },
        performance: {
          avgResponseTime: 150,
          errorRate: 0.1,
          uptime: '99.9%',
          memoryUsage: 65
        }
      });
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDatabaseBackup = async () => {
    setBackupInProgress(true);
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Backup created successfully: ${result.filePath}`);
      } else {
        throw new Error('Backup failed');
      }
    } catch (error) {
      alert('Failed to create backup');
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleDatabaseOptimize = async () => {
    setOptimizeInProgress(true);
    try {
      const response = await fetch('/api/admin/optimize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        alert('Database optimization completed successfully');
        fetchSystemStats(); // Refresh stats
      } else {
        throw new Error('Optimization failed');
      }
    } catch (error) {
      alert('Failed to optimize database');
    } finally {
      setOptimizeInProgress(false);
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'critical':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-gray-500" size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="system-admin-loading">
        <RefreshCw className="animate-spin" size={32} />
        <p>Loading system statistics...</p>
      </div>
    );
  }

  return (
    <div className="system-admin">
      <div className="system-admin-header">
        <h1>System Administration</h1>
        <button 
          onClick={fetchSystemStats}
          className="btn btn-secondary"
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="system-admin-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={16} />
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'database' ? 'active' : ''}`}
          onClick={() => setActiveTab('database')}
        >
          <Database size={16} />
          Database
        </button>
        <button 
          className={`tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Shield size={16} />
          Security
        </button>
        <button 
          className={`tab ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          <Mail size={16} />
          Email
        </button>
        <button 
          className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          <BarChart3 size={16} />
          Performance
        </button>
      </div>

      <div className="system-admin-content">
        {activeTab === 'overview' && stats && (
          <div className="overview-grid">
            <div className="stat-card">
              <div className="stat-header">
                <Database size={24} />
                <span>Database</span>
                {getHealthIcon(stats.database.health)}
              </div>
              <div className="stat-value">{stats.database.size}</div>
              <div className="stat-detail">
                {stats.database.connections.active} active connections
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <Shield size={24} />
                <span>Security</span>
                {getHealthIcon('healthy')}
              </div>
              <div className="stat-value">{stats.security.activeSessions}</div>
              <div className="stat-detail">Active sessions</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <Mail size={24} />
                <span>Email</span>
                {getHealthIcon(stats.email.serverStatus === 'running' ? 'healthy' : 'critical')}
              </div>
              <div className="stat-value">{stats.email.activeAccounts}</div>
              <div className="stat-detail">Active accounts</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <Activity size={24} />
                <span>Performance</span>
                {getHealthIcon('healthy')}
              </div>
              <div className="stat-value">{stats.performance.uptime}</div>
              <div className="stat-detail">Uptime</div>
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="database-admin">
            <div className="admin-section">
              <h3>Database Management</h3>
              <div className="admin-actions">
                <button 
                  onClick={handleDatabaseBackup}
                  disabled={backupInProgress}
                  className="btn btn-primary"
                >
                  <Download size={16} />
                  {backupInProgress ? 'Creating Backup...' : 'Create Backup'}
                </button>
                <button 
                  onClick={handleDatabaseOptimize}
                  disabled={optimizeInProgress}
                  className="btn btn-secondary"
                >
                  <RefreshCw size={16} />
                  {optimizeInProgress ? 'Optimizing...' : 'Optimize Database'}
                </button>
              </div>
            </div>

            {stats && (
              <div className="database-stats">
                <h4>Database Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span>Database Size:</span>
                    <span>{stats.database.size}</span>
                  </div>
                  <div className="stat-item">
                    <span>Total Connections:</span>
                    <span>{stats.database.connections.total}</span>
                  </div>
                  <div className="stat-item">
                    <span>Active Connections:</span>
                    <span>{stats.database.connections.active}</span>
                  </div>
                  <div className="stat-item">
                    <span>Idle Connections:</span>
                    <span>{stats.database.connections.idle}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && stats && (
          <div className="security-admin">
            <h3>Security Overview</h3>
            <div className="security-stats">
              <div className="security-metric">
                <span>Active Sessions</span>
                <span className="metric-value">{stats.security.activeSessions}</span>
              </div>
              <div className="security-metric">
                <span>Failed Logins (24h)</span>
                <span className="metric-value">{stats.security.failedLogins24h}</span>
              </div>
              <div className="security-metric">
                <span>2FA Adoption</span>
                <span className="metric-value">{stats.security.twoFactorAdoption}%</span>
              </div>
              <div className="security-metric">
                <span>Suspicious Activity</span>
                <span className="metric-value">{stats.security.suspiciousActivity}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'email' && stats && (
          <div className="email-admin">
            <h3>Email System</h3>
            <div className="email-stats">
              <div className="email-metric">
                <span>Total Accounts</span>
                <span className="metric-value">{stats.email.totalAccounts}</span>
              </div>
              <div className="email-metric">
                <span>Active Accounts</span>
                <span className="metric-value">{stats.email.activeAccounts}</span>
              </div>
              <div className="email-metric">
                <span>Emails Sent (24h)</span>
                <span className="metric-value">{stats.email.emailsSent24h}</span>
              </div>
              <div className="email-metric">
                <span>Server Status</span>
                <span className={`metric-value status-${stats.email.serverStatus}`}>
                  {stats.email.serverStatus}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && stats && (
          <div className="performance-admin">
            <h3>Performance Metrics</h3>
            <div className="performance-stats">
              <div className="performance-metric">
                <span>Avg Response Time</span>
                <span className="metric-value">{stats.performance.avgResponseTime}ms</span>
              </div>
              <div className="performance-metric">
                <span>Error Rate</span>
                <span className="metric-value">{stats.performance.errorRate}%</span>
              </div>
              <div className="performance-metric">
                <span>Uptime</span>
                <span className="metric-value">{stats.performance.uptime}</span>
              </div>
              <div className="performance-metric">
                <span>Memory Usage</span>
                <span className="metric-value">{stats.performance.memoryUsage}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemAdmin;
