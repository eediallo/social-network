import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Logout from "./components/Logout"
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Router>
          <nav style={{ textAlign: "center", margin: "2rem 0" }}>
        <Link to="/login">
          <button style={{ marginRight: "1rem" }}>Login</button>
        </Link>
        <Link to="/register">
          <button>Register</button>
        </Link>
        {isAuthenticated && (
          <Link to="/logout">
            <button style={{ marginLeft: "1rem" }}>Logout</button>
          </Link>
        )}
      </nav>
      <Routes>
        <Route
          path="/login"
          element={<Login onLogin={() => setIsAuthenticated(true)} />}
        />
        <Route
          path="/register"
          element={<Register onRegister={() => setIsAuthenticated(false)} />}
        />
        <Route
          path="/logout"
          element={<Logout onLogout={() => setIsAuthenticated(false)} />}
        />
        <Route path="/" element={<Home isAuthenticated={isAuthenticated} />} />
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
