import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/useUser';
import { useNotifications } from '../context/NotificationContext';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useUser();
  const location = useLocation();

  const navItems = [
    { path: '/feed', label: '', icon: '🏠' },
    { path: '/groups', label: '', icon: '👥' },
    { path: '/invitations', label: '', icon: '📧' },
    { path: '/requests', label: '', icon: '👤' },
    { path: '/messages', label: '', icon: '💬' },
  ];

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
              <NotificationBell />
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
