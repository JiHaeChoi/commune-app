import { useState, useEffect, useRef, useCallback } from "react";

const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
`;

const AVATARS = [
  { name: "Mika", color: "#E8453C", emoji: "🦊" },
  { name: "Jules", color: "#3C7CE8", emoji: "🐋" },
  { name: "Sora", color: "#8B5CF6", emoji: "🦋" },
  { name: "Ren", color: "#059669", emoji: "🌿" },
  { name: "Lux", color: "#F59E0B", emoji: "✨" },
];

const CURRENT_USER = AVATARS[1];
const REACTION_EMOJIS = ["❤️", "🔥", "😂", "🤯", "💀", "🥺", "👏", "✨"];
const REACTION_LIFETIME = 5000;

/* ─── API Helpers ─── */

async function fetchBookByISBN(isbn) {
  const clean = isbn.replace(/[-\s]/g, "");
  const res = await fetch(`https://openlibrary.org/isbn/${clean}.json`);
  if (!res.ok) throw new Error("Book not found");
  const data = await res.json();
  let authorName = "Unknown Author";
  if (data.authors && data.authors.length > 0) {
    try {
      const aRes = await fetch(`https://openlibrary.org${data.authors[0].key}.json`);
      const aData = await aRes.json();
      authorName = aData.name || "Unknown Author";
    } catch { /* keep default */ }
  }
  const coverId = data.covers?.[0];
  return {
    type: "book",
    title: data.title,
    author: authorName,
    isbn: clean,
    cover: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
    pages: data.number_of_pages || null,
    publishDate: data.publish_date || null,
    url: `https://openlibrary.org/isbn/${clean}`,
  };
}

function parseSpotifyUrl(url) {
  const urlMatch = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
  if (urlMatch) return { contentType: urlMatch[1], id: urlMatch[2] };
  const uriMatch = url.match(/spotify:(track|album|playlist|episode):([a-zA-Z0-9]+)/);
  if (uriMatch) return { contentType: uriMatch[1], id: uriMatch[2] };
  return null;
}

function parseYoutubeUrl(url) {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/* ─── Media Cards ─── */

function BookCard({ media }) {
  return (
    <a href={media.url} target="_blank" rel="noopener noreferrer" style={{
      display: "flex", gap: "16px", textDecoration: "none",
      background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
      borderRadius: "16px", padding: "16px", overflow: "hidden",
      border: "1px solid #FDE68A", transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "pointer",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      {media.cover ? (
        <img src={media.cover} alt={media.title} style={{
          width: "80px", height: "120px", objectFit: "cover",
          borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          flexShrink: 0,
        }} />
      ) : (
        <div style={{
          width: "80px", height: "120px", borderRadius: "10px",
          background: "#D97706", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "32px", flexShrink: 0,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>📖</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
        <div style={{
          fontFamily: "'DM Sans'", fontSize: "10px", fontWeight: 600,
          color: "#B45309", textTransform: "uppercase", letterSpacing: "1.5px",
          marginBottom: "6px",
        }}>
          📚 Book · ISBN {media.isbn}
        </div>
        <div style={{
          fontFamily: "'Instrument Serif'", fontSize: "18px", color: "#1a1a1a",
          lineHeight: 1.3, marginBottom: "4px",
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {media.title}
        </div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "13px", color: "#92400E" }}>
          {media.author}
        </div>
        {(media.pages || media.publishDate) && (
          <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#B45309", marginTop: "4px", opacity: 0.7 }}>
            {media.pages && `${media.pages} pages`}{media.pages && media.publishDate && " · "}{media.publishDate}
          </div>
        )}
      </div>
    </a>
  );
}

function SpotifyCard({ media }) {
  return (
    <div style={{ borderRadius: "16px", overflow: "hidden" }}>
      <iframe
        src={`https://open.spotify.com/embed/${media.contentType}/${media.spotifyId}?utm_source=generator&theme=0`}
        width="100%"
        height={media.contentType === "track" ? "152" : "352"}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{ borderRadius: "16px" }}
      />
    </div>
  );
}

function YoutubeCard({ media }) {
  return (
    <div style={{
      borderRadius: "16px", overflow: "hidden",
      position: "relative", paddingBottom: "56.25%", height: 0,
    }}>
      <iframe
        src={`https://www.youtube.com/embed/${media.youtubeId}`}
        style={{
          position: "absolute", top: 0, left: 0,
          width: "100%", height: "100%", border: "none",
          borderRadius: "16px",
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

function MediaCard({ media }) {
  if (media.type === "book") return <BookCard media={media} />;
  if (media.type === "spotify") return <SpotifyCard media={media} />;
  if (media.type === "youtube") return <YoutubeCard media={media} />;
  return null;
}

/* ─── Floating Reaction ─── */

function FloatingReaction({ emoji, onComplete }) {
  const [progress, setProgress] = useState(1);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 1 - elapsed / REACTION_LIFETIME);
      setProgress(remaining);
      setOpacity(remaining < 0.3 ? remaining / 0.3 : 1);
      if (remaining <= 0) { clearInterval(timer); onComplete(); }
    }, 50);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div style={{
      opacity, display: "inline-flex", alignItems: "center", gap: "4px",
      background: "rgba(255,255,255,0.95)", borderRadius: "20px",
      padding: "4px 10px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      fontSize: "14px", position: "relative", overflow: "hidden",
      transition: "opacity 0.3s ease",
    }}>
      <div style={{
        position: "absolute", bottom: 0, left: 0, height: "2px",
        width: `${progress * 100}%`,
        background: "linear-gradient(90deg, #E8453C, #F59E0B)",
        borderRadius: "2px", transition: "width 0.1s linear",
      }} />
      <span style={{ fontSize: "16px" }}>{emoji}</span>
    </div>
  );
}

/* ─── Content Linker ─── */

function ContentLinker({ onAdd }) {
  const [mode, setMode] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "book") {
        const book = await fetchBookByISBN(input);
        onAdd(book);
      } else if (mode === "spotify") {
        const parsed = parseSpotifyUrl(input);
        if (!parsed) throw new Error("Invalid Spotify link. Paste a Spotify track, album, or playlist URL.");
        onAdd({ type: "spotify", contentType: parsed.contentType, spotifyId: parsed.id, url: input });
      } else if (mode === "youtube") {
        const videoId = parseYoutubeUrl(input);
        if (!videoId) throw new Error("Invalid YouTube link. Paste a YouTube video URL.");
        onAdd({ type: "youtube", youtubeId: videoId, url: input });
      }
      setInput("");
      setMode(null);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  if (!mode) {
    return (
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {[
          { key: "book", icon: "📚", label: "Book (ISBN)", bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
          { key: "spotify", icon: "🎵", label: "Spotify", bg: "#ECFDF5", border: "#A7F3D0", text: "#047857" },
          { key: "youtube", icon: "🎬", label: "YouTube", bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C" },
        ].map(b => (
          <button key={b.key} onClick={() => setMode(b.key)} style={{
            background: b.bg, border: `1px solid ${b.border}`,
            borderRadius: "12px", padding: "10px 16px", cursor: "pointer",
            fontFamily: "'DM Sans'", fontSize: "13px", color: b.text,
            fontWeight: 500, display: "flex", alignItems: "center", gap: "6px",
            transition: "transform 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
            onMouseLeave={e => e.currentTarget.style.transform = ""}
          >
            {b.icon} {b.label}
          </button>
        ))}
      </div>
    );
  }

  const placeholders = {
    book: "Enter ISBN (e.g. 978-0-13-468599-1)",
    spotify: "Paste Spotify link (e.g. https://open.spotify.com/track/...)",
    youtube: "Paste YouTube link (e.g. https://youtube.com/watch?v=...)",
  };

  return (
    <div style={{
      background: "#F9FAFB", borderRadius: "14px", padding: "14px",
      border: "1px solid #E5E7EB",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span style={{ fontSize: "16px" }}>
          {mode === "book" ? "📚" : mode === "spotify" ? "🎵" : "🎬"}
        </span>
        <span style={{ fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
          {mode === "book" ? "Link a Book" : mode === "spotify" ? "Link from Spotify" : "Link a YouTube Video"}
        </span>
        <button onClick={() => { setMode(null); setError(""); setInput(""); }} style={{
          marginLeft: "auto", background: "none", border: "none",
          cursor: "pointer", color: "#9CA3AF", fontSize: "18px",
        }}>×</button>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder={placeholders[mode]} autoFocus
          style={{
            flex: 1, border: "1px solid #D1D5DB", borderRadius: "10px",
            padding: "10px 14px", fontFamily: "'DM Sans'", fontSize: "13px",
            outline: "none", background: "white",
          }}
          onFocus={e => e.target.style.borderColor = "#3C7CE8"}
          onBlur={e => e.target.style.borderColor = "#D1D5DB"}
        />
        <button onClick={handleAdd} disabled={!input.trim() || loading} style={{
          background: input.trim() && !loading ? "#1a1a1a" : "#D1D5DB",
          border: "none", borderRadius: "10px", padding: "10px 18px",
          cursor: input.trim() && !loading ? "pointer" : "default",
          fontFamily: "'DM Sans'", fontSize: "13px", color: "white", fontWeight: 500,
        }}>
          {loading ? "..." : "Add"}
        </button>
      </div>
      {error && (
        <div style={{
          fontFamily: "'DM Sans'", fontSize: "12px", color: "#DC2626",
          marginTop: "8px", padding: "6px 10px",
          background: "#FEF2F2", borderRadius: "8px",
        }}>{error}</div>
      )}
    </div>
  );
}

/* ─── Post Component ─── */

function Post({ post, onAddComment, onAddReaction, onRemoveReaction }) {
  const [commentText, setCommentText] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);

  const handleComment = () => {
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText);
    setCommentText("");
  };

  return (
    <article style={{
      background: "white", borderRadius: "24px", padding: "28px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)",
      border: "1px solid rgba(0,0,0,0.04)", animation: "fadeSlideUp 0.4s ease",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <div style={{
          width: "44px", height: "44px", borderRadius: "14px",
          background: post.author.color, display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: "22px",
        }}>{post.author.emoji}</div>
        <div>
          <div style={{ fontFamily: "'DM Sans'", fontWeight: 600, fontSize: "15px", color: "#1a1a1a" }}>{post.author.name}</div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#9CA3AF" }}>{post.time}</div>
        </div>
      </div>

      {post.text && (
        <p style={{
          fontFamily: "'DM Sans'", fontSize: "15px", lineHeight: 1.65,
          color: "#374151", margin: "0 0 18px 0",
        }}>{post.text}</p>
      )}

      {post.media.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
          {post.media.map((m, i) => <MediaCard key={i} media={m} />)}
        </div>
      )}

      {post.reactions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
          {post.reactions.map(r => (
            <FloatingReaction key={r.id} emoji={r.emoji} onComplete={() => onRemoveReaction(post.id, r.id)} />
          ))}
        </div>
      )}

      {/* Action bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        paddingTop: "14px", borderTop: "1px solid #F3F4F6", position: "relative",
      }}>
        <button onClick={() => setShowReactions(!showReactions)} style={{
          background: showReactions ? "#FEF2F2" : "#F9FAFB",
          border: "none", borderRadius: "12px", padding: "8px 14px",
          cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px",
          color: showReactions ? "#E8453C" : "#6B7280", fontWeight: 500,
        }}>😊 React</button>
        <button onClick={() => setShowCommentInput(true)} style={{
          background: "#F9FAFB", border: "none", borderRadius: "12px",
          padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans'",
          fontSize: "13px", color: "#6B7280", fontWeight: 500,
        }}>💬 Comment</button>
        <div style={{ marginLeft: "auto", fontFamily: "'DM Sans'", fontSize: "12px", color: "#D1D5DB" }}>
          {post.comments.length} comment{post.comments.length !== 1 ? "s" : ""}
        </div>

        {showReactions && (
          <div style={{
            position: "absolute", bottom: "48px", left: 0,
            background: "white", borderRadius: "18px", padding: "8px 10px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            display: "flex", gap: "4px", animation: "fadeSlideUp 0.2s ease", zIndex: 10,
          }}>
            {REACTION_EMOJIS.map(emoji => (
              <button key={emoji} onClick={() => { onAddReaction(post.id, emoji); setShowReactions(false); }}
                style={{
                  background: "none", border: "none", fontSize: "22px",
                  cursor: "pointer", padding: "6px", borderRadius: "10px",
                  transition: "transform 0.15s, background 0.15s",
                }}
                onMouseEnter={e => { e.target.style.transform = "scale(1.3)"; e.target.style.background = "#F3F4F6"; }}
                onMouseLeave={e => { e.target.style.transform = "scale(1)"; e.target.style.background = "none"; }}
              >{emoji}</button>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      {(post.comments.length > 0 || showCommentInput) && (
        <div style={{ marginTop: "16px" }}>
          {post.comments.map(c => (
            <div key={c.id} style={{
              display: "flex", gap: "10px", marginBottom: "10px",
              padding: "10px 14px", background: "#FAFAFA", borderRadius: "14px",
            }}>
              <div style={{
                width: "30px", height: "30px", borderRadius: "10px",
                background: c.author.color, display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0,
              }}>{c.author.emoji}</div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ fontFamily: "'DM Sans'", fontWeight: 600, fontSize: "13px" }}>{c.author.name}</span>
                  <span style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF" }}>{c.time}</span>
                </div>
                <p style={{ fontFamily: "'DM Sans'", fontSize: "13px", color: "#4B5563", margin: "4px 0 0", lineHeight: 1.5 }}>
                  {c.text}
                </p>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
            <div style={{
              width: "30px", height: "30px", borderRadius: "10px",
              background: CURRENT_USER.color, display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0,
            }}>{CURRENT_USER.emoji}</div>
            <input
              autoFocus={showCommentInput}
              value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleComment()}
              placeholder="Write a comment..."
              style={{
                flex: 1, border: "1px solid #E5E7EB", borderRadius: "12px",
                padding: "10px 14px", fontFamily: "'DM Sans'", fontSize: "13px",
                outline: "none", background: "white",
              }}
              onFocus={e => e.target.style.borderColor = "#3C7CE8"}
              onBlur={e => e.target.style.borderColor = "#E5E7EB"}
            />
            <button onClick={handleComment} disabled={!commentText.trim()} style={{
              background: commentText.trim() ? "#1a1a1a" : "#E5E7EB",
              border: "none", borderRadius: "12px", padding: "10px 16px",
              cursor: commentText.trim() ? "pointer" : "default",
              fontFamily: "'DM Sans'", fontSize: "13px",
              color: commentText.trim() ? "white" : "#9CA3AF", fontWeight: 500,
            }}>Post</button>
          </div>
        </div>
      )}
    </article>
  );
}

/* ─── Compose Modal ─── */

function ComposeModal({ onClose, onPublish }) {
  const [text, setText] = useState("");
  const [media, setMedia] = useState([]);
  const [showLinker, setShowLinker] = useState(true);

  const addMedia = (m) => { setMedia(prev => [...prev, m]); setShowLinker(false); };
  const removeMedia = (i) => setMedia(media.filter((_, j) => j !== i));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      backdropFilter: "blur(8px)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 100,
      animation: "fadeIn 0.2s ease",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "white", borderRadius: "28px", padding: "32px",
        width: "92%", maxWidth: "560px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
        animation: "fadeSlideUp 0.3s ease",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "'Instrument Serif'", fontSize: "24px", margin: 0, color: "#1a1a1a" }}>
            Share something
          </h2>
          <button onClick={onClose} style={{
            background: "#F3F4F6", border: "none", width: "36px", height: "36px",
            borderRadius: "12px", cursor: "pointer", fontSize: "18px",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280",
          }}>×</button>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px",
            background: CURRENT_USER.color, display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0,
          }}>{CURRENT_USER.emoji}</div>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder="What's on your mind? Share a thought alongside a book, song, or video..."
            style={{
              flex: 1, border: "none", resize: "none", fontFamily: "'DM Sans'",
              fontSize: "15px", lineHeight: 1.6, outline: "none", minHeight: "80px", color: "#1a1a1a",
            }}
          />
        </div>

        {media.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            {media.map((m, i) => (
              <div key={i} style={{ position: "relative" }}>
                <MediaCard media={m} />
                <button onClick={() => removeMedia(i)} style={{
                  position: "absolute", top: "8px", right: "8px",
                  background: "rgba(0,0,0,0.6)", border: "none",
                  width: "28px", height: "28px", borderRadius: "50%",
                  cursor: "pointer", color: "white", fontSize: "14px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(4px)",
                }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ paddingTop: "16px", borderTop: "1px solid #F3F4F6", marginBottom: "20px" }}>
          <div style={{
            fontFamily: "'DM Sans'", fontSize: "12px", fontWeight: 600,
            color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px",
            marginBottom: "10px",
          }}>Link content</div>
          {showLinker ? (
            <ContentLinker onAdd={addMedia} />
          ) : (
            <button onClick={() => setShowLinker(true)} style={{
              background: "#F9FAFB", border: "1px dashed #D1D5DB",
              borderRadius: "12px", padding: "12px", width: "100%",
              cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: "#6B7280",
            }}>+ Link another</button>
          )}
        </div>

        <button
          onClick={() => { if (text.trim() || media.length > 0) { onPublish(text, media); onClose(); } }}
          disabled={!text.trim() && media.length === 0}
          style={{
            width: "100%",
            background: (text.trim() || media.length > 0) ? "#1a1a1a" : "#E5E7EB",
            border: "none", borderRadius: "14px", padding: "14px",
            cursor: (text.trim() || media.length > 0) ? "pointer" : "default",
            fontFamily: "'DM Sans'", fontSize: "15px",
            color: (text.trim() || media.length > 0) ? "white" : "#9CA3AF",
            fontWeight: 600, transition: "all 0.2s",
          }}
        >Publish</button>
      </div>
    </div>
  );
}

/* ─── Sample Posts ─── */

const SAMPLE_POSTS = [
  {
    id: 1, author: AVATARS[0], time: "12m ago",
    text: "Just finished this and I'm still processing it. Arguably one of the most important books of the decade on how we relate to technology.",
    media: [{ type: "book", title: "Digital Minimalism", author: "Cal Newport", isbn: "0525536515", cover: "https://covers.openlibrary.org/b/isbn/0525536515-L.jpg", pages: 284, publishDate: "2019", url: "https://openlibrary.org/isbn/0525536515" }],
    comments: [
      { id: 1, author: AVATARS[3], text: "Cal Newport is brilliant. Have you read Deep Work?", time: "8m ago" },
    ],
    reactions: [],
  },
  {
    id: 2, author: AVATARS[2], time: "1h ago",
    text: "This track has been on repeat all morning. The production on this is insane.",
    media: [{ type: "spotify", contentType: "track", spotifyId: "4cOdK2wGLETKBW3PvgPWqT", url: "" }],
    comments: [
      { id: 1, author: AVATARS[4], text: "Radiohead never misses. Everything In Its Right Place hits differently at 2am.", time: "45m ago" },
    ],
    reactions: [],
  },
  {
    id: 3, author: AVATARS[4], time: "3h ago",
    text: "If you haven't seen this yet, drop everything. One of the best explanations of how large language models actually work.",
    media: [{ type: "youtube", youtubeId: "zjkBMFhNj_g", url: "" }],
    comments: [],
    reactions: [],
  },
];

/* ─── App ─── */

export default function App() {
  const [posts, setPosts] = useState(SAMPLE_POSTS);
  const [composing, setComposing] = useState(false);
  const rIdRef = useRef(100);

  const addComment = useCallback((postId, text) => {
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p, comments: [...p.comments, { id: Date.now(), author: CURRENT_USER, text, time: "now" }]
    } : p));
  }, []);

  const addReaction = useCallback((postId, emoji) => {
    const id = ++rIdRef.current;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: [...p.reactions, { id, emoji }] } : p));
  }, []);

  const removeReaction = useCallback((postId, reactionId) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: p.reactions.filter(r => r.id !== reactionId) } : p));
  }, []);

  const publishPost = useCallback((text, media) => {
    setPosts(prev => [{
      id: Date.now(), author: CURRENT_USER, time: "just now",
      text, media, comments: [], reactions: [],
    }, ...prev]);
  }, []);

  return (
    <>
      <style>{FONTS_CSS}{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F5F3EF; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        ::selection { background: #E8453C22; }
        input::placeholder, textarea::placeholder { color: #9CA3AF; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #F5F3EF 0%, #EDE9E3 100%)" }}>
        <header style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(245,243,239,0.85)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0,0,0,0.04)", padding: "16px 24px",
        }}>
          <div style={{
            maxWidth: "600px", margin: "0 auto",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <h1 style={{
              fontFamily: "'Instrument Serif'", fontSize: "28px",
              color: "#1a1a1a", fontWeight: 400, fontStyle: "italic",
            }}>commune</h1>
            <button onClick={() => setComposing(true)} style={{
              background: "#1a1a1a", border: "none", borderRadius: "14px",
              padding: "10px 20px", cursor: "pointer", fontFamily: "'DM Sans'",
              fontSize: "14px", color: "white", fontWeight: 500,
              display: "flex", alignItems: "center", gap: "6px",
              transition: "transform 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}
            >+ Share</button>
          </div>
        </header>

        <div style={{ maxWidth: "600px", margin: "20px auto 0", padding: "0 16px" }}>
          <div style={{
            background: "linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 50%, #F0F9FF 100%)",
            borderRadius: "16px", padding: "14px 20px",
            display: "flex", alignItems: "center", gap: "10px",
            border: "1px solid rgba(232,69,60,0.1)",
          }}>
            <span style={{ fontSize: "18px" }}>⏳</span>
            <span style={{ fontFamily: "'DM Sans'", fontSize: "13px", color: "#6B7280", lineHeight: 1.4 }}>
              Reactions are <strong style={{ color: "#E8453C" }}>ephemeral</strong> — they fade after 5 seconds. Share books by ISBN, music via Spotify, and videos from YouTube.
            </span>
          </div>
        </div>

        <main style={{
          maxWidth: "600px", margin: "20px auto", padding: "0 16px 60px",
          display: "flex", flexDirection: "column", gap: "20px",
        }}>
          {posts.map(post => (
            <Post key={post.id} post={post}
              onAddComment={addComment}
              onAddReaction={addReaction}
              onRemoveReaction={removeReaction}
            />
          ))}
        </main>
      </div>

      {composing && <ComposeModal onClose={() => setComposing(false)} onPublish={publishPost} />}
    </>
  );
}
