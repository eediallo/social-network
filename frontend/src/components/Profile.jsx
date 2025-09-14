import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "../context/useUser";

export default function Profile() {
  const { id } = useParams();
  const { user } = useUser();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/users/${id}/profile`, {
          credentials: "include",
        });
        if (!res.ok) {
          setError("Profile not available");
          return;
        }
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error("Failed to load profile", err);
        setError("Failed to load profile");
      }
    }
    load();
  }, [id]);

  if (error) return <div>{error}</div>;
  if (!profile) return <div>Loading profile...</div>;

  const isOwner = user && user.id === profile.user_id;

  async function handleFollow() {
    setLoadingAction(true);
    try {
      await fetch(`/api/follow/requests/${profile.user_id}`, {
        method: "POST",
        credentials: "include",
      });
      // reload
      const res = await fetch(`/api/users/${id}/profile`, {
        credentials: "include",
      });
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error("Follow failed", err);
      setError("Could not follow user");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleUnfollow() {
    setLoadingAction(true);
    try {
      await fetch(`/api/follow/${profile.user_id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const res = await fetch(`/api/users/${id}/profile`, {
        credentials: "include",
      });
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error("Unfollow failed", err);
      setError("Could not unfollow user");
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "2rem auto",
        display: "grid",
        gridTemplateColumns: "150px 1fr",
        gap: "1rem",
      }}
    >
      <div>
        {profile.avatar_path ? (
          <img
            src={`/images/${profile.avatar_path}`}
            alt="avatar"
            style={{
              width: 150,
              height: 150,
              objectFit: "cover",
              borderRadius: 8,
            }}
          />
        ) : (
          <div
            style={{
              width: 150,
              height: 150,
              background: "#eee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
            }}
          >
            <span>Avatar</span>
          </div>
        )}
      </div>
      <div>
        <h2>
          {profile.first_name} {profile.last_name}{" "}
          {profile.nickname && <small>({profile.nickname})</small>}
        </h2>
        <p style={{ color: "#666" }}>{profile.about || ""}</p>

        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <div>
            <strong>{profile.followers_count}</strong>
            <div style={{ fontSize: 12 }}>Followers</div>
          </div>
          <div>
            <strong>{profile.following_count}</strong>
            <div style={{ fontSize: 12 }}>Following</div>
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          {!isOwner &&
            (profile.is_following ? (
              <button onClick={handleUnfollow} disabled={loadingAction}>
                Unfollow
              </button>
            ) : (
              <button onClick={handleFollow} disabled={loadingAction}>
                Follow
              </button>
            ))}

          {isOwner && (
            <div style={{ marginTop: "0.5rem" }}>
              <div>
                <strong>Email:</strong> {profile.email}
              </div>
              <div>
                <strong>Date of birth:</strong> {profile.date_of_birth}
              </div>
              <a href="/me/edit">
                <button style={{ marginTop: 8 }}>Edit profile</button>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
