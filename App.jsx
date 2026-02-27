import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const FONTS_CSS = `@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');`;

const AVATARS = [
  { name: "Mika", color: "#E8453C", emoji: "🦊" },
  { name: "Jules", color: "#3C7CE8", emoji: "🐋" },
  { name: "Sora", color: "#8B5CF6", emoji: "🦋" },
  { name: "Ren", color: "#059669", emoji: "🌿" },
  { name: "Lux", color: "#F59E0B", emoji: "✨" },
  { name: "Kai", color: "#EC4899", emoji: "🦩" },
];
const CURRENT_USER = AVATARS[1];
const REACTION_EMOJIS = ["❤️", "🔥", "😂", "🤯", "💀", "🥺", "👏", "✨"];
const REACTION_LIFETIME = 5000;
const MAX_WORDS = 150;

const CUISINE_OPTIONS = ["Korean","Japanese","Chinese","Thai","Vietnamese","Indian","Italian","French","Mexican","American","Mediterranean","Café","Bakery","Bar","Brunch","Fine Dining","Street Food","Vegan","Seafood","BBQ","Pizza","Ramen","Sushi","Other"];

const MEDIA_TYPES = [
  { key: "book", icon: "📚", label: "Book", bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
  { key: "spotify", icon: "🎵", label: "Music", bg: "#ECFDF5", border: "#A7F3D0", text: "#047857" },
  { key: "youtube", icon: "🎬", label: "Video", bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C" },
  { key: "podcast", icon: "🎙️", label: "Podcast", bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D" },
  { key: "article", icon: "📝", label: "Article", bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  { key: "place", icon: "📍", label: "Place", bg: "#FDF4FF", border: "#E9D5FF", text: "#7E22CE" },
];

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "book", icon: "📚", label: "Books" },
  { key: "spotify", icon: "🎵", label: "Music" },
  { key: "youtube", icon: "🎬", label: "Videos" },
  { key: "place", icon: "📍", label: "Places" },
  { key: "podcast", icon: "🎙️", label: "Podcasts" },
  { key: "article", icon: "📝", label: "Articles" },
];

/* ─── Helpers ─── */
async function fetchBookByISBN(isbn) {
  const clean = isbn.replace(/[-\s]/g, "");
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}&maxResults=1`);
  if (!res.ok) throw new Error("Failed to search books");
  const data = await res.json();
  if (!data.items || data.items.length === 0) throw new Error("No book found for this ISBN.");
  const vol = data.items[0].volumeInfo;
  return { type: "book", title: vol.title || "Unknown", subtitle: vol.subtitle || null, author: (vol.authors || []).join(", ") || "Unknown", isbn: clean, cover: vol.imageLinks?.thumbnail?.replace("http:", "https:") || null, pages: vol.pageCount || null, publishDate: vol.publishedDate || null, categories: vol.categories || [], url: vol.infoLink || `https://isbnsearch.org/isbn/${clean}` };
}
async function fetchArticleTitle(url) {
  try { const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) }); const h = await r.text(); const m = h.match(/<title[^>]*>([^<]+)<\/title>/i); if (m?.[1]) return m[1].trim(); } catch {}
  try { return new URL(url).hostname.replace("www.", ""); } catch {} return url;
}
function parseSpotifyUrl(u) { const m = u.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/) || u.match(/spotify:(track|album|playlist|episode|show):([a-zA-Z0-9]+)/); return m ? { contentType: m[1], id: m[2] } : null; }
function parseYoutubeUrl(u) { for (const p of [/youtu\.be\/([a-zA-Z0-9_-]{11})/, /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/, /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/, /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/]) { const m = u.match(p); if (m) return m[1]; } return null; }
function parseGoogleMapsUrl(url) { let name = null; const pm = url.match(/\/place\/([^/@]+)/); if (pm) name = decodeURIComponent(pm[1]).replace(/\+/g, " "); const qm = url.match(/[?&]q=([^&]+)/); if (!name && qm) name = decodeURIComponent(qm[1]).replace(/\+/g, " "); return { name, originalUrl: url }; }
function isGoogleMapsUrl(s) { return /google\.(com|co\.\w+)\/maps|maps\.app\.goo\.gl/i.test(s); }
function buildMapQuery(n, l) { return encodeURIComponent([n, l].filter(Boolean).join(", ")); }
function countWords(s) { return s.trim() ? s.trim().split(/\s+/).length : 0; }
function getMediaKey(media) {
  if (!media) return null;
  if (media.type === "book") return `book-${media.isbn || media.title}`;
  if (media.type === "spotify" || media.type === "podcast") return `spotify-${media.spotifyId}`;
  if (media.type === "youtube") return `youtube-${media.youtubeId}`;
  if (media.type === "article") return `article-${media.url}`;
  if (media.type === "place") return `place-${media.name}-${media.location || ""}`;
  return null;
}

/* ─── Media Cards ─── */
function BookCard({ media }) {
  return (
    <a href={media.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", gap: "16px", textDecoration: "none", background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)", borderRadius: "16px", padding: "16px", border: "1px solid #FDE68A", transition: "transform 0.2s", cursor: "pointer" }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = ""}>
      {media.cover ? <img src={media.cover} alt={media.title} style={{ width: "80px", height: "120px", objectFit: "cover", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", flexShrink: 0 }} /> : <div style={{ width: "80px", height: "120px", borderRadius: "10px", background: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", flexShrink: 0 }}>📖</div>}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "10px", fontWeight: 600, color: "#B45309", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "6px" }}>📚 Book{media.isbn ? ` · ISBN ${media.isbn}` : ""}</div>
        <div style={{ fontFamily: "'Instrument Serif'", fontSize: "18px", color: "#1a1a1a", lineHeight: 1.3, marginBottom: "2px" }}>{media.title}</div>
        {media.subtitle && <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#92400E", opacity: 0.8 }}>{media.subtitle}</div>}
        <div style={{ fontFamily: "'DM Sans'", fontSize: "13px", color: "#92400E" }}>{media.author}</div>
        {(media.pages || media.publishDate) && <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#B45309", marginTop: "4px", opacity: 0.7 }}>{media.pages && `${media.pages}p`}{media.pages && media.publishDate && " · "}{media.publishDate}</div>}
      </div>
    </a>
  );
}
function SpotifyCard({ media }) { const h = (media.contentType === "track" || media.contentType === "episode") ? 152 : 352; return <div style={{ borderRadius: "16px", overflow: "hidden" }}><iframe src={`https://open.spotify.com/embed/${media.contentType}/${media.spotifyId}?utm_source=generator&theme=0`} width="100%" height={h} frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style={{ borderRadius: "16px" }} /></div>; }
function YoutubeCard({ media }) { return <div style={{ borderRadius: "16px", overflow: "hidden", position: "relative", paddingBottom: "56.25%", height: 0 }}><iframe src={`https://www.youtube.com/embed/${media.youtubeId}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: "16px" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" /></div>; }
function ArticleCard({ media }) { return <a href={media.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "14px", background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)", borderRadius: "16px", padding: "16px", textDecoration: "none", border: "1px solid #BFDBFE" }}><div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>📝</div><div style={{ minWidth: 0 }}><div style={{ fontFamily: "'DM Sans'", fontSize: "10px", fontWeight: 600, color: "#1D4ED8", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px" }}>Article</div><div style={{ fontFamily: "'Instrument Serif'", fontSize: "16px", color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{media.title}</div><div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#60A5FA", marginTop: "2px" }}>{media.displayUrl || media.url}</div></div></a>; }
function PlaceCard({ media, compact }) {
  const mq = buildMapQuery(media.name, media.location);
  const mapsLink = media.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${mq}`;
  return (
    <div style={{ background: "linear-gradient(135deg, #FDF4FF 0%, #F3E8FF 100%)", borderRadius: "16px", overflow: "hidden", border: "1px solid #E9D5FF" }}>
      <div style={{ padding: "16px" }}>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "10px", fontWeight: 600, color: "#7E22CE", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px" }}>📍 Place</div>
        <div style={{ fontFamily: "'Instrument Serif'", fontSize: "20px", color: "#1a1a1a", marginBottom: "6px" }}>{media.name}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {media.cuisine && <span style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 500, background: "#E9D5FF", color: "#6B21A8", padding: "3px 10px", borderRadius: "8px" }}>🍽️ {media.cuisine}</span>}
          {media.location && <span style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 500, background: "#F3E8FF", color: "#7E22CE", padding: "3px 10px", borderRadius: "8px" }}>📍 {media.location}</span>}
        </div>
        {media.note && <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#6B7280", fontStyle: "italic", marginTop: "6px" }}>"{media.note}"</div>}
      </div>
      <div style={{ width: "100%", height: compact ? "140px" : "180px", borderTop: "1px solid #E9D5FF" }}>
        <iframe width="100%" height={compact ? "140" : "180"} frameBorder="0" style={{ border: 0, display: "block" }} loading="lazy" src={`https://www.google.com/maps?q=${mq}&output=embed`} allowFullScreen />
      </div>
      <a href={mapsLink} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", fontFamily: "'DM Sans'", fontSize: "12px", fontWeight: 500, color: "#7E22CE", textDecoration: "none", background: "rgba(126,34,206,0.04)", borderTop: "1px solid #E9D5FF" }}>Open in Google Maps ↗</a>
    </div>
  );
}
function MediaCard({ media, compact }) {
  if (!media) return null;
  if (media.type === "book") return <BookCard media={media} />;
  if (media.type === "spotify" || media.type === "podcast") return <SpotifyCard media={media} />;
  if (media.type === "youtube") return <YoutubeCard media={media} />;
  if (media.type === "article") return <ArticleCard media={media} />;
  if (media.type === "place") return <PlaceCard media={media} compact={compact} />;
  return null;
}

/* ─── Floating Reaction ─── */
function FloatingReaction({ emoji, onComplete }) {
  const [progress, setProgress] = useState(1);
  const [opacity, setOpacity] = useState(1);
  useEffect(() => { const s = Date.now(); const t = setInterval(() => { const r = Math.max(0, 1 - (Date.now() - s) / REACTION_LIFETIME); setProgress(r); setOpacity(r < 0.3 ? r / 0.3 : 1); if (r <= 0) { clearInterval(t); onComplete(); } }, 50); return () => clearInterval(t); }, [onComplete]);
  return <div style={{ opacity, display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.95)", borderRadius: "20px", padding: "4px 10px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", bottom: 0, left: 0, height: "2px", width: `${progress * 100}%`, background: "linear-gradient(90deg, #E8453C, #F59E0B)", borderRadius: "2px" }} /><span style={{ fontSize: "16px" }}>{emoji}</span></div>;
}

/* ─── Word-limited Textarea ─── */
function LimitedTextarea({ value, onChange, placeholder, autoFocus }) {
  const words = countWords(value);
  const over = words > MAX_WORDS;
  return (
    <div style={{ flex: 1 }}>
      <textarea value={value} onChange={e => { if (countWords(e.target.value) <= MAX_WORDS + 5) onChange(e.target.value); }} placeholder={placeholder} autoFocus={autoFocus}
        style={{ width: "100%", border: "none", resize: "none", fontFamily: "'DM Sans'", fontSize: "15px", lineHeight: 1.6, outline: "none", minHeight: "80px", color: over ? "#DC2626" : "#1a1a1a" }} />
      <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: over ? "#DC2626" : words > MAX_WORDS * 0.8 ? "#F59E0B" : "#D1D5DB", textAlign: "right", marginTop: "-4px" }}>
        {words}/{MAX_WORDS} words
      </div>
    </div>
  );
}

/* ─── Place Linker ─── */
function PlaceLinker({ onAdd }) {
  const [mode, setMode] = useState(null);
  const [mapsUrl, setMapsUrl] = useState("");
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [cf, setCf] = useState("");
  const [mq, setMq] = useState("");
  const db = useRef(null);
  const handleUrlPaste = v => { setMapsUrl(v); if (isGoogleMapsUrl(v)) { const p = parseGoogleMapsUrl(v); if (p.name) setName(p.name); } };
  useEffect(() => { if (db.current) clearTimeout(db.current); db.current = setTimeout(() => { const q = [name, location].filter(s => s.trim()).join(", "); setMq(q.trim() ? encodeURIComponent(q) : ""); }, 600); return () => clearTimeout(db.current); }, [name, location]);
  const filtered = CUISINE_OPTIONS.filter(c => c.toLowerCase().includes(cf.toLowerCase()));
  const handleAdd = () => { if (!name.trim()) return; onAdd({ type: "place", name: name.trim(), cuisine: cuisine || null, location: location.trim() || null, note: note.trim() || null, mapsUrl: mapsUrl.trim() || null }); };
  const IS = { border: "1px solid #D1D5DB", borderRadius: "10px", padding: "10px 14px", fontFamily: "'DM Sans'", fontSize: "13px", outline: "none", background: "white", width: "100%" };
  if (!mode) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <button onClick={() => setMode("url")} style={{ background: "#FDF4FF", border: "1px solid #E9D5FF", borderRadius: "12px", padding: "14px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px" }}><span style={{ fontSize: "24px" }}>🔗</span><div><div style={{ fontFamily: "'DM Sans'", fontSize: "14px", fontWeight: 600, color: "#7E22CE" }}>Paste Google Maps link</div><div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF" }}>Auto-fills place name</div></div></button>
      <button onClick={() => setMode("manual")} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "14px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px" }}><span style={{ fontSize: "24px" }}>✏️</span><div><div style={{ fontFamily: "'DM Sans'", fontSize: "14px", fontWeight: 600, color: "#374151" }}>Enter manually</div><div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF" }}>Type name, cuisine, location</div></div></button>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {mode === "url" && <div><label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#7E22CE", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>Google Maps Link</label><input value={mapsUrl} onChange={e => handleUrlPaste(e.target.value)} placeholder="https://www.google.com/maps/place/..." style={IS} autoFocus /></div>}
      <div><label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>Place Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Blue Bottle Coffee" style={IS} autoFocus={mode === "manual"} /></div>
      <div style={{ position: "relative" }}><label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>Cuisine / Type</label><input value={cuisine || cf} onChange={e => { setCf(e.target.value); setCuisine(""); setShowDrop(true); }} onFocus={() => setShowDrop(true)} placeholder="e.g. Korean, Café..." style={IS} />
        {showDrop && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "white", borderRadius: "10px", border: "1px solid #E5E7EB", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", maxHeight: "160px", overflowY: "auto", marginTop: "4px" }}>
          {filtered.map(c => <button key={c} onClick={() => { setCuisine(c); setCf(""); setShowDrop(false); }} style={{ display: "block", width: "100%", padding: "8px 14px", border: "none", background: "white", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: "#374151", textAlign: "left" }}>{c}</button>)}
          {cf && !filtered.includes(cf) && <button onClick={() => { setCuisine(cf); setCf(""); setShowDrop(false); }} style={{ display: "block", width: "100%", padding: "8px 14px", border: "none", background: "white", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: "#7E22CE", textAlign: "left", borderTop: "1px solid #F3F4F6" }}>+ Use "{cf}"</button>}
        </div>}
      </div>
      <div><label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>Town, Country</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Gangnam, Seoul" style={IS} /></div>
      <div><label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>Your Note (optional)</label><input value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} placeholder="Why you love it..." style={IS} /></div>
      {mq && <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #E9D5FF" }}><div style={{ padding: "10px 14px", background: "#FDF4FF" }}><div style={{ fontFamily: "'Instrument Serif'", fontSize: "16px", color: "#1a1a1a" }}>{name}</div><div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>{cuisine && <span style={{ fontFamily: "'DM Sans'", fontSize: "10px", background: "#E9D5FF", color: "#6B21A8", padding: "2px 8px", borderRadius: "6px" }}>🍽️ {cuisine}</span>}{location && <span style={{ fontFamily: "'DM Sans'", fontSize: "10px", background: "#F3E8FF", color: "#7E22CE", padding: "2px 8px", borderRadius: "6px" }}>📍 {location}</span>}</div></div><iframe width="100%" height="140" frameBorder="0" style={{ border: 0, display: "block" }} loading="lazy" src={`https://www.google.com/maps?q=${mq}&output=embed`} allowFullScreen /></div>}
      <button onClick={handleAdd} disabled={!name.trim()} style={{ background: name.trim() ? "#7E22CE" : "#D1D5DB", border: "none", borderRadius: "10px", padding: "10px 18px", cursor: name.trim() ? "pointer" : "default", fontFamily: "'DM Sans'", fontSize: "13px", color: "white", fontWeight: 600, alignSelf: "flex-end" }}>📍 Add place</button>
    </div>
  );
}

/* ─── Content Linker ─── */
function ContentLinker({ onAdd }) {
  const [mode, setMode] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reset = () => { setMode(null); setError(""); setInput(""); };
  const handleAdd = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "book") { onAdd(await fetchBookByISBN(input)); }
      else if (mode === "spotify") { const p = parseSpotifyUrl(input); if (!p) throw new Error("Invalid Spotify link."); onAdd({ type: "spotify", contentType: p.contentType, spotifyId: p.id, url: input }); }
      else if (mode === "youtube") { const v = parseYoutubeUrl(input); if (!v) throw new Error("Invalid YouTube link."); onAdd({ type: "youtube", youtubeId: v, url: input }); }
      else if (mode === "podcast") { const p = parseSpotifyUrl(input); if (!p || !["episode","show"].includes(p.contentType)) throw new Error("Paste a Spotify podcast link."); onAdd({ type: "podcast", contentType: p.contentType, spotifyId: p.id, url: input }); }
      else if (mode === "article") { let u = input.trim(); if (!/^https?:\/\//i.test(u)) u = "https://" + u; const t = await fetchArticleTitle(u); let d; try { d = new URL(u).hostname.replace("www.",""); } catch { d = u; } onAdd({ type: "article", url: u, title: t, displayUrl: d }); }
      reset();
    } catch (e) { setError(e.message); } setLoading(false);
  };
  if (!mode) return (
    <div>
      <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>What are you sharing?</div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {MEDIA_TYPES.map(t => <button key={t.key} onClick={() => setMode(t.key)} style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "10px 14px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: t.text, fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>{t.icon} {t.label}</button>)}
      </div>
    </div>
  );
  const ti = MEDIA_TYPES.find(t => t.key === mode);
  return (
    <div style={{ background: "#F9FAFB", borderRadius: "14px", padding: "16px", border: "1px solid #E5E7EB" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}><span style={{ fontSize: "16px" }}>{ti?.icon}</span><span style={{ fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 600, color: "#374151" }}>{ti?.label}</span><button onClick={reset} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "18px" }}>×</button></div>
      {mode === "place" ? <PlaceLinker onAdd={m => { onAdd(m); reset(); }} /> : (
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} placeholder={{ book: "Enter ISBN (e.g. 9780525536512)", spotify: "Paste Spotify link", youtube: "Paste YouTube link", podcast: "Paste Spotify episode/show link", article: "Paste article URL" }[mode]} autoFocus style={{ flex: 1, border: "1px solid #D1D5DB", borderRadius: "10px", padding: "10px 14px", fontFamily: "'DM Sans'", fontSize: "13px", outline: "none", background: "white" }} />
          <button onClick={handleAdd} disabled={!input.trim() || loading} style={{ background: input.trim() && !loading ? "#1a1a1a" : "#D1D5DB", border: "none", borderRadius: "10px", padding: "10px 18px", cursor: input.trim() && !loading ? "pointer" : "default", fontFamily: "'DM Sans'", fontSize: "13px", color: "white", fontWeight: 500 }}>{loading ? "..." : "Add"}</button>
        </div>
      )}
      {error && <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#DC2626", marginTop: "8px", padding: "6px 10px", background: "#FEF2F2", borderRadius: "8px" }}>{error}</div>}
    </div>
  );
}

/* ─── Comment Section (reusable) ─── */
function CommentSection({ comments, onAddComment, postId }) {
  const [text, setText] = useState("");
  const handleComment = () => { if (!text.trim()) return; onAddComment(postId, text); setText(""); };
  return (
    <div style={{ marginTop: "16px" }}>
      {comments.map(c => (
        <div key={c.id} style={{ display: "flex", gap: "10px", marginBottom: "10px", padding: "10px 14px", background: "#FAFAFA", borderRadius: "14px" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "10px", background: c.author.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>{c.author.emoji}</div>
          <div><div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}><span style={{ fontFamily: "'DM Sans'", fontWeight: 600, fontSize: "13px" }}>{c.author.name}</span><span style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF" }}>{c.time}</span></div><p style={{ fontFamily: "'DM Sans'", fontSize: "13px", color: "#4B5563", margin: "4px 0 0", lineHeight: 1.5 }}>{c.text}</p></div>
        </div>
      ))}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
        <div style={{ width: "30px", height: "30px", borderRadius: "10px", background: CURRENT_USER.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>{CURRENT_USER.emoji}</div>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleComment()} placeholder="Write a comment..." style={{ flex: 1, border: "1px solid #E5E7EB", borderRadius: "12px", padding: "10px 14px", fontFamily: "'DM Sans'", fontSize: "13px", outline: "none", background: "white" }} />
        <button onClick={handleComment} disabled={!text.trim()} style={{ background: text.trim() ? "#1a1a1a" : "#E5E7EB", border: "none", borderRadius: "12px", padding: "10px 16px", cursor: text.trim() ? "pointer" : "default", fontFamily: "'DM Sans'", fontSize: "13px", color: text.trim() ? "white" : "#9CA3AF", fontWeight: 500 }}>Post</button>
      </div>
    </div>
  );
}

/* ─── Post (Feed card) ─── */
function Post({ post, onAddComment, onAddReaction, onRemoveReaction, onViewItem }) {
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  return (
    <article style={{ background: "white", borderRadius: "24px", padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.04)", animation: "fadeSlideUp 0.4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: post.author.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>{post.author.emoji}</div>
        <div><div style={{ fontFamily: "'DM Sans'", fontWeight: 600, fontSize: "15px", color: "#1a1a1a" }}>{post.author.name}</div><div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#9CA3AF" }}>{post.time}</div></div>
      </div>
      <p style={{ fontFamily: "'DM Sans'", fontSize: "15px", lineHeight: 1.65, color: "#374151", margin: "0 0 18px 0" }}>{post.text}</p>
      {post.media && <div style={{ marginBottom: "18px", cursor: "pointer" }} onClick={() => onViewItem(getMediaKey(post.media))}><MediaCard media={post.media} compact /></div>}
      {post.reactions.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>{post.reactions.map(r => <FloatingReaction key={r.id} emoji={r.emoji} onComplete={() => onRemoveReaction(post.id, r.id)} />)}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingTop: "14px", borderTop: "1px solid #F3F4F6", position: "relative" }}>
        <button onClick={() => setShowReactions(!showReactions)} style={{ background: showReactions ? "#FEF2F2" : "#F9FAFB", border: "none", borderRadius: "12px", padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: showReactions ? "#E8453C" : "#6B7280", fontWeight: 500 }}>😊 React</button>
        <button onClick={() => setShowComments(!showComments)} style={{ background: "#F9FAFB", border: "none", borderRadius: "12px", padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>💬 {post.comments.length}</button>
        {post.media && <button onClick={() => onViewItem(getMediaKey(post.media))} style={{ marginLeft: "auto", background: "#F9FAFB", border: "none", borderRadius: "12px", padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>View all thoughts →</button>}
        {showReactions && <div style={{ position: "absolute", bottom: "48px", left: 0, background: "white", borderRadius: "18px", padding: "8px 10px", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", display: "flex", gap: "4px", animation: "fadeSlideUp 0.2s ease", zIndex: 10 }}>{REACTION_EMOJIS.map(emoji => <button key={emoji} onClick={() => { onAddReaction(post.id, emoji); setShowReactions(false); }} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", padding: "6px", borderRadius: "10px" }}>{emoji}</button>)}</div>}
      </div>
      {showComments && <CommentSection comments={post.comments} onAddComment={onAddComment} postId={post.id} />}
    </article>
  );
}

/* ─── Item Detail Page ─── */
function ItemDetailPage({ mediaKey, posts, onBack, onAddComment, onAddReaction, onRemoveReaction }) {
  const relatedPosts = posts.filter(p => getMediaKey(p.media) === mediaKey);
  const media = relatedPosts[0]?.media;
  const totalComments = relatedPosts.reduce((a, p) => a + p.comments.length, 0);
  if (!media) return null;
  return (
    <div style={{ animation: "fadeSlideUp 0.3s ease" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "14px", color: "#6B7280", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>← Back to feed</button>
      {/* Item card */}
      <div style={{ background: "white", borderRadius: "24px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)", marginBottom: "16px" }}>
        <MediaCard media={media} />
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", fontFamily: "'DM Sans'", fontSize: "13px", color: "#9CA3AF" }}>
          <span>{relatedPosts.length} thought{relatedPosts.length !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{totalComments} comment{totalComments !== 1 ? "s" : ""}</span>
        </div>
      </div>
      {/* All posts about this item */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {relatedPosts.map(post => (
          <div key={post.id} style={{ background: "white", borderRadius: "20px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: post.author.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{post.author.emoji}</div>
              <div><div style={{ fontFamily: "'DM Sans'", fontWeight: 600, fontSize: "14px", color: "#1a1a1a" }}>{post.author.name}</div><div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF" }}>{post.time}</div></div>
            </div>
            <p style={{ fontFamily: "'DM Sans'", fontSize: "14px", lineHeight: 1.6, color: "#374151", margin: 0 }}>{post.text}</p>
            {post.reactions.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>{post.reactions.map(r => <FloatingReaction key={r.id} emoji={r.emoji} onComplete={() => onRemoveReaction(post.id, r.id)} />)}</div>}
            <CommentSection comments={post.comments} onAddComment={onAddComment} postId={post.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Compose Modal ─── */
function ComposeModal({ onClose, onPublish }) {
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const canPublish = text.trim() && countWords(text) <= MAX_WORDS && media;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, animation: "fadeIn 0.2s ease" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: "28px", padding: "32px", width: "92%", maxWidth: "560px", boxShadow: "0 24px 64px rgba(0,0,0,0.15)", animation: "fadeSlideUp 0.3s ease", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}><h2 style={{ fontFamily: "'Instrument Serif'", fontSize: "24px", margin: 0 }}>Share something</h2><button onClick={onClose} style={{ background: "#F3F4F6", border: "none", width: "36px", height: "36px", borderRadius: "12px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>×</button></div>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "4px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: CURRENT_USER.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>{CURRENT_USER.emoji}</div>
          <LimitedTextarea value={text} onChange={setText} placeholder="Share your thoughts..." />
        </div>
        {(!text.trim() || !media) && <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#9CA3AF", marginBottom: "12px", padding: "8px 12px", background: "#F9FAFB", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px" }}><span>💡</span>{!media && !text.trim() ? "Add an item and share your thoughts" : !media ? "Now link an item below" : "Write your thoughts to publish"}</div>}
        {media && <div style={{ position: "relative", marginBottom: "16px" }}><MediaCard media={media} compact /><button onClick={() => setMedia(null)} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", border: "none", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", color: "white", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button></div>}
        {!media && <div style={{ paddingTop: "16px", borderTop: "1px solid #F3F4F6", marginBottom: "20px" }}><ContentLinker onAdd={m => setMedia(m)} /></div>}
        <button onClick={() => { if (canPublish) { onPublish(text, media); onClose(); } }} disabled={!canPublish} style={{ width: "100%", background: canPublish ? "#1a1a1a" : "#E5E7EB", border: "none", borderRadius: "14px", padding: "14px", cursor: canPublish ? "pointer" : "default", fontFamily: "'DM Sans'", fontSize: "15px", color: canPublish ? "white" : "#9CA3AF", fontWeight: 600 }}>{canPublish ? "Publish" : countWords(text) > MAX_WORDS ? `Over ${MAX_WORDS} word limit` : "Add item + thoughts to publish"}</button>
      </div>
    </div>
  );
}

/* ─── Search Bar ─── */
function SearchBar({ query, onQueryChange, activeFilter, onFilterChange }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ position: "relative", marginBottom: "12px" }}>
        <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", color: "#9CA3AF" }}>🔍</span>
        <input value={query} onChange={e => onQueryChange(e.target.value)} placeholder="Search books, music, places, videos..."
          style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: "16px", padding: "12px 14px 12px 40px", fontFamily: "'DM Sans'", fontSize: "14px", outline: "none", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          onFocus={e => e.target.style.borderColor = "#3C7CE8"} onBlur={e => e.target.style.borderColor = "#E5E7EB"} />
      </div>
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
        {FILTER_TABS.map(t => (
          <button key={t.key} onClick={() => onFilterChange(t.key)} style={{
            background: activeFilter === t.key ? "#1a1a1a" : "white",
            color: activeFilter === t.key ? "white" : "#6B7280",
            border: activeFilter === t.key ? "none" : "1px solid #E5E7EB",
            borderRadius: "12px", padding: "6px 14px", cursor: "pointer",
            fontFamily: "'DM Sans'", fontSize: "12px", fontWeight: 500,
            whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px",
            transition: "all 0.15s",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>
    </div>
  );
}

/* ─── Sample Data ─── */
const SAMPLE_POSTS = [
  { id: 1, author: AVATARS[0], time: "12m ago", text: "Just finished this and I'm still processing it. One of the most important books of the decade on how we relate to technology.", media: { type: "book", title: "Digital Minimalism", subtitle: "Choosing a Focused Life in a Noisy World", author: "Cal Newport", isbn: "0525536512", cover: "https://books.google.com/books/content?id=iDosDwAAQBAJ&printsec=frontcover&img=1&zoom=1", pages: 284, publishDate: "2019", categories: ["Self-Help"], url: "https://isbnsearch.org/isbn/0525536512" }, comments: [{ id: 1, author: AVATARS[3], text: "Cal Newport is brilliant. Have you read Deep Work?", time: "8m ago" }], reactions: [] },
  { id: 7, author: AVATARS[5], time: "30m ago", text: "Re-reading this after 5 years. Hits completely different now that I actually struggle with phone addiction.", media: { type: "book", title: "Digital Minimalism", subtitle: "Choosing a Focused Life in a Noisy World", author: "Cal Newport", isbn: "0525536512", cover: "https://books.google.com/books/content?id=iDosDwAAQBAJ&printsec=frontcover&img=1&zoom=1", pages: 284, publishDate: "2019", categories: ["Self-Help"], url: "https://isbnsearch.org/isbn/0525536512" }, comments: [{ id: 1, author: AVATARS[0], text: "Same! Chapter 3 felt like it was written about me.", time: "20m ago" }, { id: 2, author: AVATARS[2], text: "Adding this to my list right now.", time: "15m ago" }], reactions: [] },
  { id: 2, author: AVATARS[2], time: "1h ago", text: "This track has been on repeat all morning. The production is insane.", media: { type: "spotify", contentType: "track", spotifyId: "4cOdK2wGLETKBW3PvgPWqT", url: "" }, comments: [{ id: 1, author: AVATARS[4], text: "Radiohead never misses.", time: "45m ago" }], reactions: [] },
  { id: 3, author: AVATARS[4], time: "3h ago", text: "Drop everything and watch this. Best explanation of how LLMs work.", media: { type: "youtube", youtubeId: "zjkBMFhNj_g", url: "" }, comments: [], reactions: [] },
  { id: 4, author: AVATARS[3], time: "5h ago", text: "Found my new favorite spot for working remotely. The oat milk latte here is life-changing.", media: { type: "place", name: "Café Integral", cuisine: "Café", location: "Nolita, New York", note: "Try the cascara fizz", mapsUrl: null }, comments: [{ id: 1, author: AVATARS[5], text: "Oh I love that place!", time: "4h ago" }], reactions: [] },
  { id: 5, author: AVATARS[5], time: "8h ago", text: "This essay changed how I think about productivity. Worth the 15 min read.", media: { type: "article", title: "The Tyranny of Time", url: "https://www.noemamag.com/the-tyranny-of-time/", displayUrl: "noemamag.com" }, comments: [], reactions: [] },
  { id: 6, author: AVATARS[1], time: "10h ago", text: "Best Korean BBQ I've ever had outside of Seoul. The banchan alone is worth the trip.", media: { type: "place", name: "Kang Ho Dong Baekjeong", cuisine: "Korean BBQ", location: "Koreatown, Los Angeles", note: "Get the combo for 2", mapsUrl: null }, comments: [{ id: 1, author: AVATARS[3], text: "Koreatown LA is undefeated", time: "9h ago" }], reactions: [] },
];

/* ─── App ─── */
export default function App() {
  const [posts, setPosts] = useState(SAMPLE_POSTS);
  const [composing, setComposing] = useState(false);
  const [page, setPage] = useState("feed"); // "feed" | "search" | "item"
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewingItem, setViewingItem] = useState(null);
  const rIdRef = useRef(100);

  const addComment = useCallback((postId, text) => { setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, { id: Date.now(), author: CURRENT_USER, text, time: "now" }] } : p)); }, []);
  const addReaction = useCallback((postId, emoji) => { const id = ++rIdRef.current; setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: [...p.reactions, { id, emoji }] } : p)); }, []);
  const removeReaction = useCallback((postId, rid) => { setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: p.reactions.filter(r => r.id !== rid) } : p)); }, []);
  const publishPost = useCallback((text, media) => { setPosts(prev => [{ id: Date.now(), author: CURRENT_USER, time: "just now", text, media, comments: [], reactions: [] }, ...prev]); }, []);

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (activeFilter !== "all") {
      if (activeFilter === "spotify") result = result.filter(p => p.media?.type === "spotify");
      else result = result.filter(p => p.media?.type === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => {
        const m = p.media;
        if (!m) return false;
        const searchable = [
          p.text, m.title, m.author, m.name, m.cuisine, m.location, m.note, m.subtitle,
          m.isbn, m.displayUrl, m.url,
          ...(m.categories || []),
        ].filter(Boolean).join(" ").toLowerCase();
        return searchable.includes(q);
      });
    }
    return result;
  }, [posts, activeFilter, searchQuery]);

  const handleViewItem = (key) => { setViewingItem(key); setPage("item"); };

  return (
    <>
      <style>{FONTS_CSS}{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F5F3EF; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        ::selection { background: #E8453C22; }
        input::placeholder, textarea::placeholder { color: #9CA3AF; }
        ::-webkit-scrollbar { height: 4px; } ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 2px; }
      `}</style>
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #F5F3EF 0%, #EDE9E3 100%)" }}>
        {/* Header */}
        <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(245,243,239,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(0,0,0,0.04)", padding: "16px 24px" }}>
          <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 onClick={() => { setPage("feed"); setViewingItem(null); }} style={{ fontFamily: "'Instrument Serif'", fontSize: "28px", color: "#1a1a1a", fontWeight: 400, fontStyle: "italic", cursor: "pointer" }}>commune</h1>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setPage(page === "search" ? "feed" : "search")} style={{ background: page === "search" ? "#1a1a1a" : "#F3F4F6", color: page === "search" ? "white" : "#6B7280", border: "none", borderRadius: "12px", padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 500 }}>🔍 Discover</button>
              <button onClick={() => setComposing(true)} style={{ background: "#1a1a1a", border: "none", borderRadius: "14px", padding: "8px 18px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: "white", fontWeight: 500 }}>+ Share</button>
            </div>
          </div>
        </header>

        <main style={{ maxWidth: "600px", margin: "20px auto", padding: "0 16px 60px" }}>
          {/* Search / Discover page */}
          {(page === "search" || page === "feed") && page === "search" && (
            <SearchBar query={searchQuery} onQueryChange={setSearchQuery} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          )}

          {/* Item Detail Page */}
          {page === "item" && viewingItem && (
            <ItemDetailPage mediaKey={viewingItem} posts={posts} onBack={() => { setPage("feed"); setViewingItem(null); }} onAddComment={addComment} onAddReaction={addReaction} onRemoveReaction={removeReaction} />
          )}

          {/* Feed or Search results */}
          {page !== "item" && (
            <>
              {page === "feed" && (
                <div style={{ background: "linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 50%, #F0F9FF 100%)", borderRadius: "16px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "10px", border: "1px solid rgba(232,69,60,0.1)", marginBottom: "20px" }}>
                  <span style={{ fontSize: "18px" }}>⏳</span>
                  <span style={{ fontFamily: "'DM Sans'", fontSize: "13px", color: "#6B7280", lineHeight: 1.4 }}>Share an item + your thoughts (max {MAX_WORDS} words). Reactions are <strong style={{ color: "#E8453C" }}>ephemeral</strong>. Click any item to see all thoughts.</span>
                </div>
              )}
              {page === "search" && searchQuery && filteredPosts.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", fontFamily: "'DM Sans'", color: "#9CA3AF" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
                  <div style={{ fontSize: "15px" }}>No results for "{searchQuery}"</div>
                  <div style={{ fontSize: "13px", marginTop: "4px" }}>Try a different search or filter</div>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {(page === "search" ? filteredPosts : posts).map(post => (
                  <Post key={post.id} post={post} onAddComment={addComment} onAddReaction={addReaction} onRemoveReaction={removeReaction} onViewItem={handleViewItem} />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
      {composing && <ComposeModal onClose={() => setComposing(false)} onPublish={publishPost} />}
    </>
  );
}
