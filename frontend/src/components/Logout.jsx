import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout({ onLogout }) {
  const navigate = useNavigate();

  useEffect(() => {
    let didLogout = false;
    async function doLogout() {
      if (didLogout) return;
      didLogout = true;
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (onLogout) onLogout();
      navigate("/login", { replace: true });
    }
    doLogout();
    // Only run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <p>Logging out...</p>;
}
