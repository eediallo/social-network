import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/useUser';

export default function Navbar() {
  const { user, logout } = useUser();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Feed', icon: '🏠' },
    { path: '/groups', label: 'Groups', icon: '👥' },
    { path: '/notifications', label: 'Notifications', icon: '🔔' },
    { path: '/chat', label: 'Chat', icon: '💬' },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="d-flex justify-between align-center">
          <Link to="/" className="navbar-brand">
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
                    }`}
                  >
                    <span className="mr-1">{item.icon}</span>
                    {item.label}
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
