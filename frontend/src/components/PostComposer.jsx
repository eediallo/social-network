import { useState } from "react";
import { useUser } from "../context/useUser";

export default function PostComposer({ onPosted }) {
  const { user } = useUser();
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() && !image) return;
    setSubmitting(true);
    try {
      // Create the post first
      const body = { text, privacy: "public" };
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        // If there is an image, upload it with the returned post id
        const j = await res.json();
        const postID = j.id;
        if (image && postID) {
          const form = new FormData();
          form.append("image", image);
          form.append("post_id", postID);
          const r2 = await fetch("/api/images/post", {
            method: "POST",
            body: form,
            credentials: "include",
          });
          if (!r2.ok) {
            console.error("failed to upload image for post", r2.status);
          }
        }
        setText("");
        setImage(null);
        if (onPosted) onPosted();
      } else {
        console.error("failed to post", res.status);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 600, margin: "0 auto 1rem" }}>
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            user
              ? `What's on your mind, ${
                  user.first_name || user.nickname || "there"
                }?`
              : "What's on your mind?"
          }
          rows={4}
          style={{ width: "100%" }}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <button type="submit" disabled={submitting}>
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
