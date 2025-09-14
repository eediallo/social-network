import { useEffect, useState } from "react";
import PostComposer from "./PostComposer";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/feed", { credentials: "include" });
      if (r.ok) {
        const j = await r.json();
        setPosts(j);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: "1rem auto" }}>
      <PostComposer onPosted={load} />
      {loading ? (
        <div>Loading feed...</div>
      ) : posts.length === 0 ? (
        <div>No posts yet.</div>
      ) : (
        posts.map((p) => (
          <article
            key={p.id}
            style={{ border: "1px solid #ddd", padding: 12, marginBottom: 8 }}
          >
            <div style={{ fontSize: 12, color: "#555" }}>
              {p.user_id} •{" "}
              {new Date(p.createdAt || p.created_at).toLocaleString()}
            </div>
            <div style={{ marginTop: 8 }}>{p.text}</div>
          </article>
        ))
      )}
    </div>
  );
}
