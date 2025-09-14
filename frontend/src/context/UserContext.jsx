import { createContext, useState, useRef } from "react";

const UserContext = createContext();

function normalizeUser(u) {
  if (!u) return null;
  // ensure `id` exists regardless of backend casing
  return {
    id: u.id || u.ID || u.Id || null,
    email: u.email || u.Email || null,
    first_name: u.first_name || u.FirstName || null,
    last_name: u.last_name || u.LastName || null,
    ...u,
  };
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const logoutCalledRef = useRef(false);

  const login = (userData) => {
    const n = normalizeUser(userData);
    setUser(n);
    setIsAuthenticated(!!n && !!n.id);
    logoutCalledRef.current = false;
  };

  const logout = async () => {
    if (logoutCalledRef.current) return;
    logoutCalledRef.current = true;
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore network errors here
    }
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <UserContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export { UserContext };
