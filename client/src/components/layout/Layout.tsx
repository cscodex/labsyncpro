import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar with Ctrl/Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }
      // Close sidebar with Escape
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // All navigation items (used for both desktop sidebar and mobile)
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    ...(user?.role === 'student'
      ? [
          { path: '/my-submissions', label: 'My Assignments', icon: '📋' },
          { path: '/groups', label: 'Groups', icon: '👥' },
          { path: '/grades', label: 'My Grades', icon: '📈' },
        ]
      : [
          { path: '/labs', label: 'Labs', icon: '🖥️' },
          { path: '/timetable', label: 'Timetable', icon: '📅' },
          { path: '/assignment-creation', label: 'Assignment Creation', icon: '📝' },
          { path: '/assignment-management', label: 'Assignment Management', icon: '📋' },
          { path: '/assignment-submissions', label: 'Assignment Submissions', icon: '📄' },
          { path: '/grades', label: 'Grades', icon: '📈' },
          { path: '/groups', label: 'Groups', icon: '👥' },
          { path: '/capacity', label: 'Capacity Planning', icon: '🪑' },
          ...(user?.role === 'admin' || user?.role === 'instructor'
            ? [{ path: '/users', label: 'Users', icon: '👤' }]
            : []
          ),
          ...(user?.role === 'admin'
            ? [
                { path: '/data-import', label: 'Data Import', icon: '📊' },
                { path: '/password-reset-requests', label: 'Password Requests', icon: '🔐' }
              ]
            : []
          ),
          ...(user?.role === 'admin' || user?.role === 'instructor'
            ? [{ path: '/data-export', label: 'Data Export', icon: '📤' }]
            : []
          ),
        ]
    ),
    { path: '/webmail', label: 'Webmail', icon: '📧' },
  ];

  return (
    <div className="layout">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            title="Toggle Navigation (Ctrl+B)"
          >
            ☰
          </button>
          <h1 className="logo">LabSyncPro</h1>

          {/* Current Page Indicator for Desktop */}
          <div className="current-page-indicator">
            {menuItems.find(item => item.path === location.pathname)?.label || 'LabSyncPro'}
          </div>
        </div>

        <div className="header-right">
          <div className="user-info">
            <span className="user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="user-role">{user?.role}</span>
          </div>

          <div className="user-menu">
            <Link to="/profile" className="profile-link">
              Profile
            </Link>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Navigation</h2>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            title="Close sidebar"
          >
            ✕
          </button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => {
                // Only close sidebar on mobile (screen width < 1024px)
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
};

export default Layout;
