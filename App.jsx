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
  { name: "Kai", color: "#EC4899", emoji: "🦩" },
];

const CURRENT_USER = AVATARS[1];
const REACTION_EMOJIS = ["❤️", "🔥", "😂", "🤯", "💀", "🥺", "👏", "✨"];
const REACTION_LIFETIME = 5000;

const CUISINE_OPTIONS = [
  "Korean", "Japanese", "Chinese", "Thai", "Vietnamese", "Indian",
  "Italian", "French", "Mexican", "American", "Mediterranean",
  "Café", "Bakery", "Bar", "Brunch", "Fine Dining", "Street Food",
  "Vegan", "Seafood", "BBQ", "Pizza", "Ramen", "Sushi", "Other"
];

const MEDIA_TYPES = [
  { key: "book",    icon: "📚", label: "Book",    desc: "Search by ISBN",              bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
  { key: "spotify", icon: "🎵", label: "Music",   desc: "Paste Spotify link",          bg: "#ECFDF5", border: "#A7F3D0", text: "#047857" },
  { key: "youtube", icon: "🎬", label: "Video",   desc: "Paste YouTube link",          bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C" },
  { key: "podcast", icon: "🎙️", label: "Podcast", desc: "Paste Spotify episode link",  bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D" },
  { key: "article", icon: "📝", label: "Article", desc: "Paste any URL",               bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  { key: "place",   icon: "📍", label: "Place",   desc: "Paste Google Maps link or enter manually", bg: "#FDF4FF", border: "#E9D5FF", text: "#7E22CE" },
];

/* ─── Helpers ─── */

async function fetchBookByISBN(isbn) {
  const clean = isbn.replace(/[-\s]/g, "");
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}&maxResults=1`);
  if (!res.ok) throw new Error("Failed to search books");
  const data = await res.json();
  if (!data.items || data.items.length === 0) throw new Error("No book found for this ISBN.");
  const vol = data.items[0].volumeInfo;
  return {
    type: "book", title: vol.title || "Unknown Title", subtitle: vol.subtitle || null,
    author: (vol.authors || []).join(", ") || "Unknown Author", isbn: clean,
    cover: vol.imageLinks?.thumbnail?.replace("http:", "https:") || null,
    pages: vol.pageCount || null, publishDate: vol.publishedDate || null,
    categories: vol.categories || [], url: vol.infoLink || `https://isbnsearch.org/isbn/${clean}`,
  };
}

async function fetchArticleTitle(url) {
  try {
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) });
    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match?.[1]) return match[1].trim();
  } catch {}
  try { return new URL(url).hostname.replace("www.", ""); } catch {}
  return url;
}

function parseSpotifyUrl(url) {
  const m = url.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/) ||
            url.match(/spotify:(track|album|playlist|episode|show):([a-zA-Z0-9]+)/);
  return m ? { contentType: m[1], id: m[2] } : null;
}

function parseYoutubeUrl(url) {
  for (const p of [/youtu\.be\/([a-zA-Z0-9_-]{11})/, /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/, /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/, /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/]) {
    const m = url.match(p); if (m) return m[1];
  }
  return null;
}

function parseGoogleMapsUrl(url) {
  // Extract place name from various Google Maps URL formats
  // Format 1: https://www.google.com/maps/place/PLACE+NAME/...
  // Format 2: https://maps.app.goo.gl/XXXXX (short link — can't parse, user fills manually)
  // Format 3: https://www.google.com/maps?q=QUERY
  // Format 4: https://www.google.com/maps/search/QUERY
  let name = null;
  let coords = null;

  // Extract coords like @37.7749,-122.4194
  const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (coordMatch) coords = { lat: coordMatch[1], lng: coordMatch[2] };

  // /place/Name+Here/
  const placeMatch = url.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    name = decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
  }

  // ?q=Query
  const qMatch = url.match(/[?&]q=([^&]+)/);
  if (!name && qMatch) {
    name = decodeURIComponent(qMatch[1]).replace(/\+/g, " ");
  }

  // /search/Query
  const searchMatch = url.match(/\/search\/([^/?]+)/);
  if (!name && searchMatch) {
    name = decodeURIComponent(searchMatch[1]).replace(/\+/g, " ");
  }

  return { name, coords, originalUrl: url };
}

function isGoogleMapsUrl(str) {
  return /google\.(com|co\.\w+)\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(str);
}

function buildMapQuery(name, location) {
  return encodeURIComponent([name, location].filter(Boolean).join(", "));
}

/* ─── Media Cards ─── */

function BookCard({ media }) {
  return (
    <a href={media.url} target="_blank" rel="noopener noreferrer" style={{
      display: "flex", gap: "16px", textDecoration: "none",
      background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
      borderRadius: "16px", padding: "16px", overflow: "hidden",
      border: "1px solid #FDE68A", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      {media.cover ? (
        <img src={media.cover} alt={media.title} style={{ width: "80px", height: "120px", objectFit: "cover", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", flexShrink: 0 }} />
      ) : (
        <div style={{ width: "80px", height: "120px", borderRadius: "10px", background: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", flexShrink: 0 }}>📖</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "10px", fontWeight: 600, color: "#B45309", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "6px" }}>📚 Book{media.isbn ? ` · ISBN ${media.isbn}` : ""}</div>
        <div style={{ fontFamily: "'Instrument Serif'", fontSize: "18px", color: "#1a1a1a", lineHeight: 1.3, marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{media.title}</div>
        {media.subtitle && <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#92400E", marginBottom: "2px", opacity: 0.8 }}>{media.subtitle}</div>}
        <div style={{ fontFamily: "'DM Sans'", fontSize: "13px", color: "#92400E" }}>{media.author}</div>
        {(media.pages || media.publishDate) && <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#B45309", marginTop: "4px", opacity: 0.7 }}>{media.pages && `${media.pages} pages`}{media.pages && media.publishDate && " · "}{media.publishDate}</div>}
      </div>
    </a>
  );
}

function SpotifyCard({ media }) {
  const h = (media.contentType === "track" || media.contentType === "episode") ? 152 : 352;
  return <div style={{ borderRadius: "16px", overflow: "hidden" }}><iframe src={`https://open.spotify.com/embed/${media.contentType}/${media.spotifyId}?utm_source=generator&theme=0`} width="100%" height={h} frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style={{ borderRadius: "16px" }} /></div>;
}

function YoutubeCard({ media }) {
  return <div style={{ borderRadius: "16px", overflow: "hidden", position: "relative", paddingBottom: "56.25%", height: 0 }}><iframe src={`https://www.youtube.com/embed/${media.youtubeId}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: "16px" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" /></div>;
}

function ArticleCard({ media }) {
  return (
    <a href={media.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "14px", background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)", borderRadius: "16px", padding: "16px", textDecoration: "none", border: "1px solid #BFDBFE", transition: "transform 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = ""}>
      <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>📝</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "10px", fontWeight: 600, color: "#1D4ED8", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px" }}>Article</div>
        <div style={{ fontFamily: "'Instrument Serif'", fontSize: "16px", color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{media.title}</div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#60A5FA", marginTop: "2px" }}>{media.displayUrl || media.url}</div>
      </div>
    </a>
  );
}

function PlaceCard({ media, compact }) {
  const mapQuery = media.mapsUrl
    ? buildMapQuery(media.name, media.location)
    : buildMapQuery(media.name, media.location);
  const mapSrc = media.mapsUrl
    ? `https://www.google.com/maps?q=${mapQuery}&output=embed`
    : `https://www.google.com/maps?q=${mapQuery}&output=embed`;
  const mapsLink = media.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  return (
    <div style={{ background: "linear-gradient(135deg, #FDF4FF 0%, #F3E8FF 100%)", borderRadius: "16px", overflow: "hidden", border: "1px solid #E9D5FF" }}>
      {/* Place info header */}
      <div style={{ padding: "16px" }}>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "10px", fontWeight: 600, color: "#7E22CE", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px" }}>📍 Place</div>
        <div style={{ fontFamily: "'Instrument Serif'", fontSize: "20px", color: "#1a1a1a", marginBottom: "6px" }}>{media.name}</div>

        {/* Info pills: cuisine + location */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: media.note ? "8px" : "0" }}>
          {media.cuisine && (
            <span style={{
              fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 500,
              background: "#E9D5FF", color: "#6B21A8", padding: "3px 10px",
              borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "4px",
            }}>🍽️ {media.cuisine}</span>
          )}
          {media.location && (
            <span style={{
              fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 500,
              background: "#F3E8FF", color: "#7E22CE", padding: "3px 10px",
              borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "4px",
            }}>📍 {media.location}</span>
          )}
        </div>

        {media.note && <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#6B7280", fontStyle: "italic", marginTop: "4px" }}>"{media.note}"</div>}
      </div>

      {/* Google Maps embed */}
      <div style={{ width: "100%", height: compact ? "160px" : "200px", borderTop: "1px solid #E9D5FF" }}>
        <iframe width="100%" height={compact ? "160" : "200"} frameBorder="0" style={{ border: 0, display: "block" }}
          loading="lazy" referrerPolicy="no-referrer-when-downgrade"
          src={mapSrc} allowFullScreen />
      </div>
      <a href={mapsLink} target="_blank" rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          padding: "10px", fontFamily: "'DM Sans'", fontSize: "12px", fontWeight: 500,
          color: "#7E22CE", textDecoration: "none", background: "rgba(126,34,206,0.04)",
          borderTop: "1px solid #E9D5FF", transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(126,34,206,0.08)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(126,34,206,0.04)"}
      >Open in Google Maps ↗</a>
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
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const r = Math.max(0, 1 - elapsed / REACTION_LIFETIME);
      setProgress(r); setOpacity(r < 0.3 ? r / 0.3 : 1);
      if (r <= 0) { clearInterval(timer); onComplete(); }
    }, 50);
    return () => clearInterval(timer);
  }, [onComplete]);
  return (
    <div style={{ opacity, display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.95)", borderRadius: "20px", padding: "4px 10px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", position: "relative", overflow: "hidden", transition: "opacity 0.3s ease" }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, height: "2px", width: `${progress * 100}%`, background: "linear-gradient(90deg, #E8453C, #F59E0B)", borderRadius: "2px", transition: "width 0.1s linear" }} />
      <span style={{ fontSize: "16px" }}>{emoji}</span>
    </div>
  );
}

/* ─── Place Linker with Google Maps URL + manual entry + live preview ─── */

function PlaceLinker({ onAdd }) {
  const [mode, setMode] = useState(null); // 'url' | 'manual'
  const [mapsUrl, setMapsUrl] = useState("");
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [showCuisineDropdown, setShowCuisineDropdown] = useState(false);
  const [cuisineFilter, setCuisineFilter] = useState("");
  const [mapPreviewQuery, setMapPreviewQuery] = useState("");
  const debounceRef = useRef(null);

  // Auto-fill from Google Maps URL
  const handleUrlPaste = (val) => {
    setMapsUrl(val);
    if (isGoogleMapsUrl(val)) {
      const parsed = parseGoogleMapsUrl(val);
      if (parsed.name) setName(parsed.name);
    }
  };

  // Debounced map preview
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = [name, location].filter(s => s.trim()).join(", ");
      setMapPreviewQuery(q.trim() ? encodeURIComponent(q) : "");
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [name, location]);

  const filteredCuisines = CUISINE_OPTIONS.filter(c =>
    c.toLowerCase().includes(cuisineFilter.toLowerCase())
  );

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      type: "place",
      name: name.trim(),
      cuisine: cuisine || null,
      location: location.trim() || null,
      note: note.trim() || null,
      mapsUrl: mapsUrl.trim() || null,
    });
  };

  const inputStyle = {
    border: "1px solid #D1D5DB", borderRadius: "10px", padding: "10px 14px",
    fontFamily: "'DM Sans'", fontSize: "13px", outline: "none", background: "white", width: "100%",
  };

  // Step 1: Choose URL or manual
  if (!mode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button onClick={() => setMode("url")} style={{
          background: "#FDF4FF", border: "1px solid #E9D5FF", borderRadius: "12px",
          padding: "14px 16px", cursor: "pointer", textAlign: "left",
          display: "flex", alignItems: "center", gap: "12px", transition: "transform 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.01)"}
          onMouseLeave={e => e.currentTarget.style.transform = ""}
        >
          <span style={{ fontSize: "24px" }}>🔗</span>
          <div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: "14px", fontWeight: 600, color: "#7E22CE" }}>Paste Google Maps link</div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF" }}>Auto-fills place name from the URL</div>
          </div>
        </button>
        <button onClick={() => setMode("manual")} style={{
          background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "12px",
          padding: "14px 16px", cursor: "pointer", textAlign: "left",
          display: "flex", alignItems: "center", gap: "12px", transition: "transform 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.01)"}
          onMouseLeave={e => e.currentTarget.style.transform = ""}
        >
          <span style={{ fontSize: "24px" }}>✏️</span>
          <div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: "14px", fontWeight: 600, color: "#374151" }}>Enter manually</div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF" }}>Type place name, cuisine, and location</div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Google Maps URL input (only in URL mode) */}
      {mode === "url" && (
        <div>
          <label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#7E22CE", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>
            Google Maps Link
          </label>
          <input value={mapsUrl} onChange={e => handleUrlPaste(e.target.value)}
            placeholder="https://www.google.com/maps/place/..."
            style={{ ...inputStyle, borderColor: mapsUrl && isGoogleMapsUrl(mapsUrl) ? "#A855F7" : "#D1D5DB" }}
            onFocus={e => e.target.style.borderColor = "#9333EA"} onBlur={e => e.target.style.borderColor = "#D1D5DB"} autoFocus />
          {mapsUrl && isGoogleMapsUrl(mapsUrl) && (
            <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#059669", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
              ✅ Google Maps link detected
            </div>
          )}
        </div>
      )}

      {/* Place name */}
      <div>
        <label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>
          Place Name *
        </label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Blue Bottle Coffee"
          style={inputStyle} autoFocus={mode === "manual"}
          onFocus={e => e.target.style.borderColor = "#9333EA"} onBlur={e => e.target.style.borderColor = "#D1D5DB"} />
      </div>

      {/* Cuisine type with searchable dropdown */}
      <div style={{ position: "relative" }}>
        <label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>
          Cuisine / Type
        </label>
        <input
          value={cuisine || cuisineFilter}
          onChange={e => { setCuisineFilter(e.target.value); setCuisine(""); setShowCuisineDropdown(true); }}
          onFocus={() => setShowCuisineDropdown(true)}
          placeholder="e.g. Korean, Café, Fine Dining..."
          style={inputStyle}
        />
        {showCuisineDropdown && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
            background: "white", borderRadius: "10px", border: "1px solid #E5E7EB",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)", maxHeight: "160px", overflowY: "auto",
            marginTop: "4px",
          }}>
            {filteredCuisines.map(c => (
              <button key={c} onClick={() => { setCuisine(c); setCuisineFilter(""); setShowCuisineDropdown(false); }}
                style={{
                  display: "block", width: "100%", padding: "8px 14px", border: "none",
                  background: cuisine === c ? "#F3E8FF" : "white", cursor: "pointer",
                  fontFamily: "'DM Sans'", fontSize: "13px", color: "#374151", textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.target.style.background = "#F9FAFB"}
                onMouseLeave={e => e.target.style.background = cuisine === c ? "#F3E8FF" : "white"}
              >{c}</button>
            ))}
            {cuisineFilter && !filteredCuisines.includes(cuisineFilter) && (
              <button onClick={() => { setCuisine(cuisineFilter); setCuisineFilter(""); setShowCuisineDropdown(false); }}
                style={{
                  display: "block", width: "100%", padding: "8px 14px", border: "none",
                  background: "white", cursor: "pointer",
                  fontFamily: "'DM Sans'", fontSize: "13px", color: "#7E22CE", textAlign: "left",
                  borderTop: "1px solid #F3F4F6",
                }}
              >+ Use "{cuisineFilter}"</button>
            )}
          </div>
        )}
      </div>

      {/* Town / Location */}
      <div>
        <label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>
          Town, Country
        </label>
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Gangnam, Seoul"
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = "#9333EA"} onBlur={e => e.target.style.borderColor = "#D1D5DB"} />
      </div>

      {/* Note */}
      <div>
        <label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>
          Your Note (optional)
        </label>
        <input value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Why you love it..."
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = "#9333EA"} onBlur={e => e.target.style.borderColor = "#D1D5DB"} />
      </div>

      {/* Live map + info preview */}
      {(name.trim() || mapPreviewQuery) && (
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #E9D5FF", marginTop: "4px" }}>
          {/* Info bar preview */}
          <div style={{ padding: "12px 14px", background: "#FDF4FF", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontFamily: "'Instrument Serif'", fontSize: "16px", color: "#1a1a1a" }}>{name || "Place name"}</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {cuisine && (
                <span style={{ fontFamily: "'DM Sans'", fontSize: "10px", fontWeight: 500, background: "#E9D5FF", color: "#6B21A8", padding: "2px 8px", borderRadius: "6px" }}>🍽️ {cuisine}</span>
              )}
              {location && (
                <span style={{ fontFamily: "'DM Sans'", fontSize: "10px", fontWeight: 500, background: "#F3E8FF", color: "#7E22CE", padding: "2px 8px", borderRadius: "6px" }}>📍 {location}</span>
              )}
            </div>
          </div>
          {/* Map */}
          {mapPreviewQuery && (
            <iframe width="100%" height="160" frameBorder="0" style={{ border: 0, display: "block" }}
              loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${mapPreviewQuery}&output=embed`} allowFullScreen />
          )}
        </div>
      )}

      <button onClick={handleAdd} disabled={!name.trim()}
        style={{
          background: name.trim() ? "#7E22CE" : "#D1D5DB",
          border: "none", borderRadius: "10px", padding: "10px 18px",
          cursor: name.trim() ? "pointer" : "default",
          fontFamily: "'DM Sans'", fontSize: "13px", color: "white", fontWeight: 600, alignSelf: "flex-end",
          transition: "background 0.2s",
        }}>📍 Add place</button>
    </div>
  );
}

/* ─── Content Linker ─── */

function ContentLinker({ onAdd }) {
  const [mode, setMode] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resetAll = () => { setMode(null); setError(""); setInput(""); };

  const handleAdd = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "book") { onAdd(await fetchBookByISBN(input)); }
      else if (mode === "spotify") { const p = parseSpotifyUrl(input); if (!p) throw new Error("Invalid Spotify link."); onAdd({ type: "spotify", contentType: p.contentType, spotifyId: p.id, url: input }); }
      else if (mode === "youtube") { const v = parseYoutubeUrl(input); if (!v) throw new Error("Invalid YouTube link."); onAdd({ type: "youtube", youtubeId: v, url: input }); }
      else if (mode === "podcast") { const p = parseSpotifyUrl(input); if (!p || !["episode","show"].includes(p.contentType)) throw new Error("Paste a Spotify podcast link."); onAdd({ type: "podcast", contentType: p.contentType, spotifyId: p.id, url: input }); }
      else if (mode === "article") { let u = input.trim(); if (!/^https?:\/\//i.test(u)) u = "https://" + u; const t = await fetchArticleTitle(u); let d; try { d = new URL(u).hostname.replace("www.",""); } catch { d = u; } onAdd({ type: "article", url: u, title: t, displayUrl: d }); }
      resetAll();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  if (!mode) {
    return (
      <div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>What are you sharing?</div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {MEDIA_TYPES.map(t => (
            <button key={t.key} onClick={() => setMode(t.key)} style={{
              background: t.bg, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "10px 14px",
              cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: t.text,
              fontWeight: 500, display: "flex", alignItems: "center", gap: "6px", transition: "transform 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}
            >{t.icon} {t.label}</button>
          ))}
        </div>
      </div>
    );
  }

  const typeInfo = MEDIA_TYPES.find(t => t.key === mode);

  return (
    <div style={{ background: "#F9FAFB", borderRadius: "14px", padding: "16px", border: "1px solid #E5E7EB" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontSize: "16px" }}>{typeInfo?.icon}</span>
        <span style={{ fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 600, color: "#374151" }}>{typeInfo?.label}</span>
        <button onClick={resetAll} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "18px" }}>×</button>
      </div>

      {mode === "place" ? (
        <PlaceLinker onAdd={(m) => { onAdd(m); resetAll(); }} />
      ) : (
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder={{ book: "Enter ISBN (e.g. 9780525536512)", spotify: "Paste Spotify link", youtube: "Paste YouTube link", podcast: "Paste Spotify episode/show link", article: "Paste article URL" }[mode]}
            autoFocus style={{ flex: 1, border: "1px solid #D1D5DB", borderRadius: "10px", padding: "10px 14px", fontFamily: "'DM Sans'", fontSize: "13px", outline: "none", background: "white" }}
            onFocus={e => e.target.style.borderColor = "#3C7CE8"} onBlur={e => e.target.style.borderColor = "#D1D5DB"} />
          <button onClick={handleAdd} disabled={!input.trim() || loading} style={{
            background: input.trim() && !loading ? "#1a1a1a" : "#D1D5DB", border: "none", borderRadius: "10px",
            padding: "10px 18px", cursor: input.trim() && !loading ? "pointer" : "default",
            fontFamily: "'DM Sans'", fontSize: "13px", color: "white", fontWeight: 500, whiteSpace: "nowrap",
          }}>{loading ? "..." : "Add"}</button>
        </div>
      )}

      {error && <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#DC2626", marginTop: "8px", padding: "6px 10px", background: "#FEF2F2", borderRadius: "8px" }}>{error}</div>}
    </div>
  );
}

/* ─── Post ─── */

function Post({ post, onAddComment, onAddReaction, onRemoveReaction }) {
  const [commentText, setCommentText] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const handleComment = () => { if (!commentText.trim()) return; onAddComment(post.id, commentText); setCommentText(""); };

  return (
    <article style={{ background: "white", borderRadius: "24px", padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.04)", animation: "fadeSlideUp 0.4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: post.author.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>{post.author.emoji}</div>
        <div>
          <div style={{ fontFamily: "'DM Sans'", fontWeight: 600, fontSize: "15px", color: "#1a1a1a" }}>{post.author.name}</div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#9CA3AF" }}>{post.time}</div>
        </div>
      </div>
      <p style={{ fontFamily: "'DM Sans'", fontSize: "15px", lineHeight: 1.65, color: "#374151", margin: "0 0 18px 0" }}>{post.text}</p>
      {post.media && <div style={{ marginBottom: "18px" }}><MediaCard media={post.media} /></div>}
      {post.reactions.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>{post.reactions.map(r => <FloatingReaction key={r.id} emoji={r.emoji} onComplete={() => onRemoveReaction(post.id, r.id)} />)}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingTop: "14px", borderTop: "1px solid #F3F4F6", position: "relative" }}>
        <button onClick={() => setShowReactions(!showReactions)} style={{ background: showReactions ? "#FEF2F2" : "#F9FAFB", border: "none", borderRadius: "12px", padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: showReactions ? "#E8453C" : "#6B7280", fontWeight: 500 }}>😊 React</button>
        <button onClick={() => setShowComments(true)} style={{ background: "#F9FAFB", border: "none", borderRadius: "12px", padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>💬 Comment</button>
        <div style={{ marginLeft: "auto", fontFamily: "'DM Sans'", fontSize: "12px", color: "#D1D5DB" }}>{post.comments.length} comment{post.comments.length !== 1 ? "s" : ""}</div>
        {showReactions && (
          <div style={{ position: "absolute", bottom: "48px", left: 0, background: "white", borderRadius: "18px", padding: "8px 10px", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", display: "flex", gap: "4px", animation: "fadeSlideUp 0.2s ease", zIndex: 10 }}>
            {REACTION_EMOJIS.map(emoji => <button key={emoji} onClick={() => { onAddReaction(post.id, emoji); setShowReactions(false); }} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", padding: "6px", borderRadius: "10px", transition: "transform 0.15s" }} onMouseEnter={e => { e.target.style.transform = "scale(1.3)"; e.target.style.background = "#F3F4F6"; }} onMouseLeave={e => { e.target.style.transform = "scale(1)"; e.target.style.background = "none"; }}>{emoji}</button>)}
          </div>
        )}
      </div>
      {(post.comments.length > 0 || showComments) && (
        <div style={{ marginTop: "16px" }}>
          {post.comments.map(c => (
            <div key={c.id} style={{ display: "flex", gap: "10px", marginBottom: "10px", padding: "10px 14px", background: "#FAFAFA", borderRadius: "14px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "10px", background: c.author.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>{c.author.emoji}</div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}><span style={{ fontFamily: "'DM Sans'", fontWeight: 600, fontSize: "13px" }}>{c.author.name}</span><span style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF" }}>{c.time}</span></div>
                <p style={{ fontFamily: "'DM Sans'", fontSize: "13px", color: "#4B5563", margin: "4px 0 0", lineHeight: 1.5 }}>{c.text}</p>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "10px", background: CURRENT_USER.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>{CURRENT_USER.emoji}</div>
            <input autoFocus={showComments} value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleComment()} placeholder="Write a comment..." style={{ flex: 1, border: "1px solid #E5E7EB", borderRadius: "12px", padding: "10px 14px", fontFamily: "'DM Sans'", fontSize: "13px", outline: "none", background: "white" }} onFocus={e => e.target.style.borderColor = "#3C7CE8"} onBlur={e => e.target.style.borderColor = "#E5E7EB"} />
            <button onClick={handleComment} disabled={!commentText.trim()} style={{ background: commentText.trim() ? "#1a1a1a" : "#E5E7EB", border: "none", borderRadius: "12px", padding: "10px 16px", cursor: commentText.trim() ? "pointer" : "default", fontFamily: "'DM Sans'", fontSize: "13px", color: commentText.trim() ? "white" : "#9CA3AF", fontWeight: 500 }}>Post</button>
          </div>
        </div>
      )}
    </article>
  );
}

/* ─── Compose Modal ─── */

function ComposeModal({ onClose, onPublish }) {
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const canPublish = text.trim() && media;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, animation: "fadeIn 0.2s ease" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: "28px", padding: "32px", width: "92%", maxWidth: "560px", boxShadow: "0 24px 64px rgba(0,0,0,0.15)", animation: "fadeSlideUp 0.3s ease", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "'Instrument Serif'", fontSize: "24px", margin: 0, color: "#1a1a1a" }}>Share something</h2>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", width: "36px", height: "36px", borderRadius: "12px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>×</button>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "4px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: CURRENT_USER.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>{CURRENT_USER.emoji}</div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share your thoughts about this..." style={{ flex: 1, border: "none", resize: "none", fontFamily: "'DM Sans'", fontSize: "15px", lineHeight: 1.6, outline: "none", minHeight: "80px", color: "#1a1a1a" }} />
        </div>
        {(!text.trim() || !media) && (
          <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#9CA3AF", marginBottom: "12px", padding: "8px 12px", background: "#F9FAFB", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px" }}>💡</span>
            {!media && !text.trim() ? "Add an item to share and write your thoughts" : !media ? "Now link an item below" : "Write your thoughts to publish"}
          </div>
        )}
        {media && (
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <MediaCard media={media} compact />
            <button onClick={() => setMedia(null)} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", border: "none", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", color: "white", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        )}
        {!media && <div style={{ paddingTop: "16px", borderTop: "1px solid #F3F4F6", marginBottom: "20px" }}><ContentLinker onAdd={m => setMedia(m)} /></div>}
        <button onClick={() => { if (canPublish) { onPublish(text, media); onClose(); } }} disabled={!canPublish} style={{ width: "100%", background: canPublish ? "#1a1a1a" : "#E5E7EB", border: "none", borderRadius: "14px", padding: "14px", cursor: canPublish ? "pointer" : "default", fontFamily: "'DM Sans'", fontSize: "15px", color: canPublish ? "white" : "#9CA3AF", fontWeight: 600, transition: "all 0.2s" }}>{canPublish ? "Publish" : "Add item + thoughts to publish"}</button>
      </div>
    </div>
  );
}

/* ─── Sample Posts ─── */
const SAMPLE_POSTS = [
  { id: 1, author: AVATARS[0], time: "12m ago", text: "Just finished this and I'm still processing it. One of the most important books of the decade on how we relate to technology.", media: { type: "book", title: "Digital Minimalism", subtitle: "Choosing a Focused Life in a Noisy World", author: "Cal Newport", isbn: "0525536512", cover: "https://books.google.com/books/content?id=iDosDwAAQBAJ&printsec=frontcover&img=1&zoom=1", pages: 284, publishDate: "2019", categories: ["Self-Help"], url: "https://isbnsearch.org/isbn/0525536512" }, comments: [{ id: 1, author: AVATARS[3], text: "Cal Newport is brilliant. Have you read Deep Work?", time: "8m ago" }], reactions: [] },
  { id: 2, author: AVATARS[2], time: "1h ago", text: "This track has been on repeat all morning. The production is insane.", media: { type: "spotify", contentType: "track", spotifyId: "4cOdK2wGLETKBW3PvgPWqT", url: "" }, comments: [{ id: 1, author: AVATARS[4], text: "Radiohead never misses.", time: "45m ago" }], reactions: [] },
  { id: 3, author: AVATARS[4], time: "3h ago", text: "Drop everything and watch this. Best explanation of how LLMs work.", media: { type: "youtube", youtubeId: "zjkBMFhNj_g", url: "" }, comments: [], reactions: [] },
  { id: 4, author: AVATARS[3], time: "5h ago", text: "Found my new favorite spot for working remotely. The oat milk latte here is life-changing.", media: { type: "place", name: "Café Integral", cuisine: "Café", location: "Nolita, New York", note: "Try the cascara fizz", mapsUrl: null }, comments: [{ id: 1, author: AVATARS[5], text: "Oh I love that place! The pastries are amazing too.", time: "4h ago" }], reactions: [] },
  { id: 5, author: AVATARS[5], time: "8h ago", text: "This essay changed how I think about productivity. Worth the 15 min read.", media: { type: "article", title: "The Tyranny of Time", url: "https://www.noemamag.com/the-tyranny-of-time/", displayUrl: "noemamag.com" }, comments: [], reactions: [] },
];

/* ─── App ─── */
export default function App() {
  const [posts, setPosts] = useState(SAMPLE_POSTS);
  const [composing, setComposing] = useState(false);
  const rIdRef = useRef(100);
  const addComment = useCallback((postId, text) => { setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, { id: Date.now(), author: CURRENT_USER, text, time: "now" }] } : p)); }, []);
  const addReaction = useCallback((postId, emoji) => { const id = ++rIdRef.current; setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: [...p.reactions, { id, emoji }] } : p)); }, []);
  const removeReaction = useCallback((postId, rid) => { setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: p.reactions.filter(r => r.id !== rid) } : p)); }, []);
  const publishPost = useCallback((text, media) => { setPosts(prev => [{ id: Date.now(), author: CURRENT_USER, time: "just now", text, media, comments: [], reactions: [] }, ...prev]); }, []);

  return (
    <>
      <style>{FONTS_CSS}{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F5F3EF; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        ::selection { background: #E8453C22; }
        input::placeholder, textarea::placeholder { color: #9CA3AF; }
      `}</style>
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #F5F3EF 0%, #EDE9E3 100%)" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(245,243,239,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(0,0,0,0.04)", padding: "16px 24px" }}>
          <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 style={{ fontFamily: "'Instrument Serif'", fontSize: "28px", color: "#1a1a1a", fontWeight: 400, fontStyle: "italic" }}>commune</h1>
            <button onClick={() => setComposing(true)} style={{ background: "#1a1a1a", border: "none", borderRadius: "14px", padding: "10px 20px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "14px", color: "white", fontWeight: 500, transition: "transform 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"} onMouseLeave={e => e.currentTarget.style.transform = ""}>+ Share</button>
          </div>
        </header>
        <div style={{ maxWidth: "600px", margin: "20px auto 0", padding: "0 16px" }}>
          <div style={{ background: "linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 50%, #F0F9FF 100%)", borderRadius: "16px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "10px", border: "1px solid rgba(232,69,60,0.1)" }}>
            <span style={{ fontSize: "18px" }}>⏳</span>
            <span style={{ fontFamily: "'DM Sans'", fontSize: "13px", color: "#6B7280", lineHeight: 1.4 }}>Share an item + your thoughts. Reactions are <strong style={{ color: "#E8453C" }}>ephemeral</strong> — they fade after 5 seconds.</span>
          </div>
        </div>
        <main style={{ maxWidth: "600px", margin: "20px auto", padding: "0 16px 60px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {posts.map(post => <Post key={post.id} post={post} onAddComment={addComment} onAddReaction={addReaction} onRemoveReaction={removeReaction} />)}
        </main>
      </div>
      {composing && <ComposeModal onClose={() => setComposing(false)} onPublish={publishPost} />}
    </>
  );
}
