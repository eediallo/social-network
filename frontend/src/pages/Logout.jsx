import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/useUser';

export default function Logout() {
  const { logout } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      await logout();
      navigate('/login');
    };
    
    handleLogout();
  }, [logout, navigate]);

  return (
    <div className="container">
      <div className="auth-container">
        <h2>Logging out...</h2>
        <div className="text-center">
          <div className="loading"></div>
        </div>
      </div>
    </div>
  );
}
