import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/useUser';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { user, logout } = useUser();
  const location = useLocation();
  const [notificationCount, setNotificationCount] = useState(0);

  const navItems = [
    { path: '/feed', label: 'Feed', icon: '🏠' },
    { path: '/groups', label: 'Groups', icon: '👥' },
    { path: '/notifications', label: 'Notifications', icon: '🔔', badge: notificationCount },
    { path: '/chat', label: 'Chat', icon: '💬' },
  ];

  useEffect(() => {
    // Fetch notification count
    const fetchNotificationCount = async () => {
      try {
        const res = await fetch('/api/notifications', { credentials: 'include' });
        if (res.ok) {
          const notifications = await res.json();
          const unreadCount = notifications.filter(n => !n.read_at).length;
          setNotificationCount(unreadCount);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    fetchNotificationCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="d-flex justify-between align-center">
          <Link to="/feed" className="navbar-brand">
            Social Network
          </Link>
          
          <div className="d-flex align-center gap-3">
            <ul className="navbar-nav">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`nav-link ${
                      location.pathname === item.path ? 'active' : ''
                    } ${item.badge > 0 ? 'badge' : ''}`}
                  >
                    <span className="mr-1">{item.icon}</span>
                    {item.label}
                    {item.badge > 0 && (
                      <span className="badge-count">{item.badge}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            
            <div className="d-flex align-center gap-2">
              <Link
                to={`/profile/${user?.id}`}
                className="btn btn-secondary btn-sm"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="btn btn-danger btn-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
