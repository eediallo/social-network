import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/useUser";

export default function EditProfile() {
  const { user, login } = useUser();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [about, setAbout] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setNickname(user.nickname || "");
    setAbout(user.about || "");
  }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, about }),
        credentials: "include",
      });
      if (!res.ok) {
        setError("Could not save profile");
        return;
      }
      if (avatarFile) {
        const form = new FormData();
        // backend expects field name 'image'
        form.append("image", avatarFile);
        const ares = await fetch("/api/images/avatar", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        if (!ares.ok) {
          setError("Avatar upload failed");
          return;
        }
      }
      // refresh user context
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (meRes.ok) {
        const userData = await meRes.json();
        login(userData);
      }
      navigate(`/profile/${user.id}`);
    } catch (err) {
      console.error(err);
      setError("Save failed");
    }
  }

  if (!user) return <div>Please login to edit your profile</div>;

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto" }}>
      <h2>Edit profile</h2>
      <form onSubmit={handleSave}>
        <div>
          <label>Nickname</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>
        <div>
          <label>About</label>
          <textarea value={about} onChange={(e) => setAbout(e.target.value)} />
        </div>
        <div>
          <label>Avatar</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files[0])}
          />
        </div>
        {error && <div style={{ color: "red" }}>{error}</div>}
        <button type="submit">Save</button>
      </form>
    </div>
  );
}
