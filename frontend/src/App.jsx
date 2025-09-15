import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Logout from "./pages/Logout";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import Invitations from "./pages/Invitations";
import Notifications from "./pages/Notifications";
import Chat from "./pages/Chat";
import { UserProvider } from "./context/UserContext";
import { useUser } from "./context/useUser";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

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
        console.log('Checking authentication with /api/auth/me');
        const res = await fetch("/api/auth/me", { credentials: "include" });
        console.log('Auth response status:', res.status);
        if (res.ok) {
          const userData = await res.json();
          console.log('User authenticated:', userData);
          login(userData);
        } else {
          console.log('Authentication failed, status:', res.status);
          logout();
        }
      } catch (err) {
        console.log('Authentication error:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        {isAuthenticated && <Navbar />}
        <main className="flex-1">
          <Routes>
            <Route 
              path="/" 
              element={
                isAuthenticated ? (
                  <Navigate to="/feed" />
                ) : (
                  <Landing />
                )
              } 
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/logout"
              element={
                isAuthenticated ? (
                  <Logout />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/feed"
              element={
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:id"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <Groups />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:id"
              element={
                <ProtectedRoute>
                  <GroupDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invitations"
              element={
                <ProtectedRoute>
                  <Invitations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
