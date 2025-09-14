import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import LogoutMessage from "./components/Logout";
import { UserProvider } from "./context/UserContext";
import { useUser } from "./context/useUser";
import ProtectedRoute from "./components/ProtectedRoute";
import Profile from "./components/Profile";
import "./App.css";

function App() {
  return (
    <UserProvider>
      <AppRoutes />
    </UserProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated, login, logout, user } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const userData = await res.json();
          login(userData);
        } else {
          logout();
        }
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    }
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <nav style={{ textAlign: "center", margin: "2rem 0" }}>
        <Link to="/login">
          <button style={{ marginRight: "1rem" }}>Login</button>
        </Link>
        <Link to="/register">
          <button>Register</button>
        </Link>
        {isAuthenticated && user && (
          <Link to={`/profile/${user.id}`}>
            <button style={{ marginLeft: "1rem" }}>My Profile</button>
          </Link>
        )}
        {isAuthenticated && (
          <Link to="/logout">
            <button style={{ marginLeft: "1rem" }}>Logout</button>
          </Link>
        )}
      </nav>
      <Routes>
        <Route path="/login" element={<Login onLogin={login} />} />
        <Route path="/register" element={<Register onRegister={logout} />} />
        <Route
          path="/logout"
          element={
            isAuthenticated ? (
              <LogoutMessage onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home isAuthenticated={isAuthenticated} />
            </ProtectedRoute>
          }
        />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

function Home({ isAuthenticated }) {
  return (
    <main style={{ textAlign: "center", marginTop: "4rem" }}>
      <h1>Welcome to Social Network</h1>
      <p>
        {isAuthenticated
          ? "You are logged in."
          : "Please login or register to continue."}
      </p>
    </main>
  );
}

export default App;
