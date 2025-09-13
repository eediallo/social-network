import { createContext, useContext, useState, useRef } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const logoutCalledRef = useRef(false);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    logoutCalledRef.current = false;
  };

  const logout = async () => {
    // guard against multiple calls (StrictMode or remounts)
    if (logoutCalledRef.current) return;
    logoutCalledRef.current = true;
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
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

export function useUser() {
  return useContext(UserContext);
}
