import { useEffect } from "react";

export default function Logout({ onLogout }) {
  useEffect(() => {
    async function doLogout() {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (onLogout) onLogout();
    }
    doLogout();
  }, [onLogout]);

  return <p>Logging out...</p>;
}
