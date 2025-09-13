import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function Logout() {
  const navigate = useNavigate();
  const { logout } = useUser();

  useEffect(() => {
    let did = false;
    async function run() {
      if (did) return;
      did = true;
      await logout();
      navigate("/login", { replace: true });
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <p>Logging out...</p>;
}
