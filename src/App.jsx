import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";

const FONTS_CSS = `@import url('https://fonts.googleapis.com/css2?family=Bungee&family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');`;

const AVATARS = [
  { name: "Mika", color: "#E8453C", emoji: "🦊" },
  { name: "Jules", color: "#3C7CE8", emoji: "🐋" },
  { name: "Sora", color: "#8B5CF6", emoji: "🦋" },
  { name: "Ren", color: "#059669", emoji: "🌿" },
  { name: "Lux", color: "#F59E0B", emoji: "✨" },
  { name: "Kai", color: "#EC4899", emoji: "🦩" },
  { name: "Nori", color: "#14B8A6", emoji: "🐙" },
  { name: "Hana", color: "#F43F5E", emoji: "🌸" },
  { name: "Zion", color: "#6366F1", emoji: "🚀" },
  { name: "Maru", color: "#EA580C", emoji: "🍊" },
  { name: "Yuki", color: "#0EA5E9", emoji: "❄️" },
  { name: "Fern", color: "#16A34A", emoji: "🌾" },
];
const CURRENT_USER = AVATARS[1];
const REACTION_EMOJIS = ["❤️", "🔥", "😂", "🤯", "💀", "🥺", "👏", "✨"];
const MAX_WORDS = 150;

const BG_COLORS = [
  { key: "warm",   label: "Warm",   bg: "linear-gradient(180deg, #F5F3EF 0%, #EDE9E3 100%)", headerBg: "rgba(245,243,239,0.85)" },
  { key: "cool",   label: "Cool",   bg: "linear-gradient(180deg, #EEF2FF 0%, #E0E7FF 100%)", headerBg: "rgba(238,242,255,0.85)" },
  { key: "dark",   label: "Dark",   bg: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)", headerBg: "rgba(26,26,46,0.92)" },
  { key: "sage",   label: "Sage",   bg: "linear-gradient(180deg, #F0F5F0 0%, #E2EBE2 100%)", headerBg: "rgba(240,245,240,0.85)" },
  { key: "peach",  label: "Peach",  bg: "linear-gradient(180deg, #FFF5F0 0%, #FFE8DB 100%)", headerBg: "rgba(255,245,240,0.85)" },
];

// ── i18n ──
const LANG = {
  en: {
    commune: "commune",
    tagline: "share what moves you",
    discover: "Discover",
    share: "Share",
    publish: "Publish",
    feed: "Feed",
    search: "Search",
    randomCircle: "Random Circle",
    sharedTaste: "Shared Taste",
    club: "Club",
    members: "members",
    matches: "matches",
    readTogether: "Read together",
    manage: "Manage",
    hide: "Hide",
    exclude: "Exclude",
    excluded: "Excluded",
    noPostsGroup: "No posts in this group yet",
    shareMore: "Share more items to find people with similar taste!",
    beFirst: "Be the first to share something!",
    noResults: "No results for",
    tryDifferent: "Try a different search or filter",
    loading: "Loading posts...",
    backToFeed: "← Back to feed",
    thoughts: "thoughts",
    react: "React",
    viewAll: "View all thoughts →",
    whatSharing: "What are you sharing?",
    pasteUrl: "Paste any URL to auto-detect",
    orChoose: "— or choose a type —",
    overLimit: "Over word limit",
    addItemToPublish: "Add item + thoughts to publish",
    all: "All",
    books: "Books",
    music: "Music",
    movies: "Movies",
    places: "Places",
    podcasts: "Podcasts",
    articles: "Articles",
    settings: "Settings",
    language: "Language",
    background: "Background",
  },
  ko: {
    commune: "commune",
    tagline: "감동을 나누다",
    discover: "탐색",
    share: "공유",
    publish: "게시",
    feed: "피드",
    search: "검색",
    randomCircle: "랜덤 서클",
    sharedTaste: "취향 공유",
    club: "클럽",
    members: "명",
    matches: "매칭",
    readTogether: "함께 읽기",
    manage: "관리",
    hide: "숨기기",
    exclude: "제외",
    excluded: "제외됨",
    noPostsGroup: "이 그룹에 아직 글이 없어요",
    shareMore: "더 많이 공유해서 취향이 비슷한 사람을 찾아보세요!",
    beFirst: "첫 번째로 공유해보세요!",
    noResults: "검색 결과 없음:",
    tryDifferent: "다른 검색어나 필터를 시도해보세요",
    loading: "로딩 중...",
    backToFeed: "← 피드로 돌아가기",
    thoughts: "개의 생각",
    react: "반응",
    viewAll: "모든 생각 보기 →",
    whatSharing: "무엇을 공유할까요?",
    pasteUrl: "URL을 붙여넣으면 자동 감지",
    orChoose: "— 또는 유형 선택 —",
    overLimit: "글자 수 초과",
    addItemToPublish: "아이템 + 생각을 추가해주세요",
    all: "전체",
    books: "책",
    music: "음악",
    movies: "영화",
    places: "장소",
    podcasts: "팟캐스트",
    articles: "아티클",
    settings: "설정",
    language: "언어",
    background: "배경",
  },
};
const LangContext = createContext("en");
function useT() { const lang = useContext(LangContext); return LANG[lang] || LANG.en; }

const CUISINE_OPTIONS = ["Korean","Japanese","Chinese","Thai","Vietnamese","Indian","Italian","French","Mexican","American","Mediterranean","Café","Bakery","Bar","Brunch","Fine Dining","Street Food","Vegan","Seafood","BBQ","Pizza","Ramen","Sushi","Other"];

const MEDIA_TYPES = [
  { key: "book",    icon: "📚", label: "Book",    bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
  { key: "spotify", icon: "🎵", label: "Music",   bg: "#ECFDF5", border: "#A7F3D0", text: "#047857" },
  { key: "movie",   icon: "🎥", label: "Movie",   bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C" },
  { key: "podcast", icon: "🎙️", label: "Podcast", bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D" },
  { key: "article", icon: "📝", label: "Article", bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  { key: "place",   icon: "📍", label: "Place",   bg: "#FDF4FF", border: "#E9D5FF", text: "#7E22CE" },
];

const FILTER_TABS = [
  { key: "all",     label: "All" },
  { key: "book",    icon: "📚", label: "Books" },
  { key: "spotify", icon: "🎵", label: "Music" },
  { key: "movie",   icon: "🎥", label: "Movies" },
  { key: "place",   icon: "📍", label: "Places" },
  { key: "podcast", icon: "🎙️", label: "Podcasts" },
  { key: "article", icon: "📝", label: "Articles" },
];

/* ═══════════════════════════════════════════════
   ID / KEY HELPERS
   ═══════════════════════════════════════════════ */

// ISBN-13 only: strip hyphens/spaces, validate 978/979 prefix + 13 digits
function normalizeIsbn13(s) {
  const d = s.replace(/[-\s]/g, "");
  return /^97[89]\d{10}$/.test(d) ? d : null;
}

// Canonical URL: enforce https, strip www, strip trailing slash, remove tracking params
function canonicalUrl(raw) {
  try {
    let u = raw.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    u = u.replace(/^http:\/\//i, "https://");
    const url = new URL(u);
    url.hostname = url.hostname.replace(/^www\./, "");
    ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","fbclid","gclid","ref"].forEach(p => url.searchParams.delete(p));
    return url.origin + url.pathname.replace(/\/+$/, "") + (url.search || "");
  } catch { return raw.trim(); }
}

// Place slug: normalize accents, lowercase, strip punctuation
function slugPlace(name, location) {
  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `place-${norm(name)}-${norm(location || "")}`;
}

function getMediaKey(media) {
  if (!media) return null;
  if (media.type === "book")    return media.isbn13 ? `book-${media.isbn13}` : `book-title-${media.title}`;
  if (media.type === "spotify" || media.type === "podcast") return `spotify-${media.spotifyId}`;
  if (media.type === "movie")   return `tmdb-${media.tmdbId}`;
  if (media.type === "youtube") return `youtube-${media.youtubeId}`;
  if (media.type === "article") return `article-${canonicalUrl(media.url)}`;
  if (media.type === "place")   return slugPlace(media.name, media.location || "");
  return null;
}

/* ═══════════════════════════════════════════════
   API HELPERS
   ═══════════════════════════════════════════════ */

function isISBN(s) { return /^[\d\-\s]{9,17}$/.test(s.trim()) && s.replace(/[-\s]/g, "").length >= 10; }

function volToBook(vol) {
  const isbn13raw = vol.industryIdentifiers?.find(i => i.type === "ISBN_13")?.identifier ?? null;
  const isbn13 = isbn13raw ? normalizeIsbn13(isbn13raw) : null;
  // Use Open Library Covers API (free, no key, no rate limit) as primary cover source
  // Google Books thumbnails are unreliable (429 errors, broken URLs)
  const cover = isbn13
    ? `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg?default=false`
    : (vol.imageLinks?.thumbnail?.replace("http:", "https:").replace("&edge=curl", "") || null);
  return {
    type: "book", isbn13,
    title: vol.title || "Unknown",
    subtitle: vol.subtitle || null,
    author: (vol.authors || []).join(", ") || "Unknown",
    cover,
    pages: vol.pageCount || null,
    publishDate: vol.publishedDate || null,
    categories: vol.categories || [],
    url: vol.infoLink || (isbn13 ? `https://openlibrary.org/isbn/${isbn13}` : "#"),
  };
}

async function searchBooks(query) {
  const isIsbn = isISBN(query);
  // Try Google Books first
  try {
    const q = isIsbn ? `isbn:${query.replace(/[-\s]/g, "")}` : encodeURIComponent(query);
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=${isIsbn ? 1 : 6}`);
    if (res.ok) {
      const data = await res.json();
      if (data.items?.length) return data.items.map(item => volToBook(item.volumeInfo));
    }
  } catch {}
  // Fallback 1: Open Library Search API (free, no key, no rate limit)
  try {
    const olQuery = isIsbn
      ? `https://openlibrary.org/search.json?isbn=${query.replace(/[-\s]/g, "")}&limit=1`
      : `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6`;
    const olRes = await fetch(olQuery, { signal: AbortSignal.timeout(8000) });
    if (olRes.ok) {
      const olData = await olRes.json();
      if (olData.docs?.length) {
        return olData.docs.slice(0, 6).map(d => {
          const isbn = d.isbn?.[0] || null;
          const isbn13 = isbn ? normalizeIsbn13(isbn) : null;
          return {
            type: "book",
            isbn13,
            title: d.title || "Unknown",
            subtitle: d.subtitle || null,
            author: d.author_name?.join(", ") || "Unknown",
            cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : (isbn13 ? `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg?default=false` : null),
            pages: d.number_of_pages_median || null,
            publishDate: d.first_publish_year?.toString() || null,
            categories: d.subject?.slice(0, 3) || [],
            url: isbn13 ? `https://openlibrary.org/isbn/${isbn13}` : `https://openlibrary.org${d.key}`,
          };
        });
      }
    }
  } catch {}
  // Fallback 2: Korean National Library (NL) API via Worker proxy
  if (isIsbn && WORKER_URL) {
    try {
      const clean = query.replace(/[-\s]/g, "");
      const nlRes = await fetch(`${WORKER_URL}/nl/search?isbn=${clean}`, { signal: AbortSignal.timeout(8000) });
      if (nlRes.ok) {
        const nlData = await nlRes.json();
        const docs = nlData.docs;
        if (docs?.length) {
          const d = docs[0];
          return [{
            type: "book",
            isbn13: normalizeIsbn13(d.EA_ISBN || clean),
            title: d.TITLE || "Unknown",
            subtitle: null,
            author: d.AUTHOR || "Unknown",
            cover: d.EA_ISBN ? `https://covers.openlibrary.org/b/isbn/${d.EA_ISBN}-L.jpg?default=false` : (d.TITLE_URL || null),
            pages: d.PAGE ? parseInt(d.PAGE) : null,
            publishDate: d.PUBLISH_PREDATE || null,
            categories: d.SUBJECT ? [d.SUBJECT] : [],
            url: d.EA_ISBN ? `https://openlibrary.org/isbn/${d.EA_ISBN}` : "#",
            publisher: d.PUBLISHER || null,
          }];
        }
      }
    } catch {}
  }
  throw new Error("No books found. Try a different title or ISBN-13.");
}

// ── Cloudflare Worker proxy URL ──
const WORKER_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_WORKER_URL) || "https://commune-api.jiha9139.workers.dev";

async function searchMusic(query) {
  if (!WORKER_URL) throw new Error("Music search requires the Cloudflare Worker proxy. See README for setup.");
  const res = await fetch(`${WORKER_URL}/spotify/search?q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) { const e = await res.text().catch(() => ""); throw new Error(e || "Spotify search failed"); }
  const data = await res.json();
  if (!data.tracks?.items?.length) throw new Error("No songs found. Try artist name or song title.");
  return data.tracks.items.map(t => ({
    type: "spotify",
    contentType: "track",
    spotifyId: t.id,
    title: t.name,
    artist: t.artists?.map(a => a.name).join(", ") || "Unknown",
    album: t.album?.name || null,
    artwork: t.album?.images?.[0]?.url || null,
    releaseDate: t.album?.release_date?.slice(0, 4) || null,
    genre: null,
    url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
  }));
}

async function searchMovies(query) {
  // TMDB public API — free read-only key. tmdbId is the canonical unique ID.
  const KEY = "2dca580c2a14b55200e784d157207b4d";
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${KEY}&query=${encodeURIComponent(query)}&include_adult=false`);
  if (!res.ok) throw new Error("Failed to search movies");
  const data = await res.json();
  if (!data.results?.length) throw new Error("No movies found. Try a different title.");
  return data.results.slice(0, 6).map(m => ({
    type: "movie",
    tmdbId: String(m.id),
    title: m.title,
    overview: m.overview || null,
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : null,
    releaseDate: m.release_date?.slice(0, 4) || null,
    rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
    url: `https://www.themoviedb.org/movie/${m.id}`,
  }));
}

async function fetchArticleTitle(url) {
  try {
    const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) });
    const h = await r.text();
    const m = h.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (m?.[1]) return m[1].trim();
  } catch {}
  try { return new URL(url).hostname.replace("www.", ""); } catch {}
  return url;
}

function parseSpotifyUrl(u) {
  const m = u.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/) ||
            u.match(/spotify:(track|album|playlist|episode|show):([a-zA-Z0-9]+)/);
  return m ? { contentType: m[1], id: m[2] } : null;
}
function parseYoutubeUrl(u) {
  for (const p of [/youtu\.be\/([a-zA-Z0-9_-]{11})/, /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/, /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/, /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/]) {
    const m = u.match(p); if (m) return m[1];
  }
  return null;
}
function parseGoogleMapsUrl(url) {
  let name = null;
  const pm = url.match(/\/place\/([^/@]+)/);
  if (pm) name = decodeURIComponent(pm[1]).replace(/\+/g, " ");
  const qm = url.match(/[?&]q=([^&]+)/);
  if (!name && qm) name = decodeURIComponent(qm[1]).replace(/\+/g, " ");
  return { name, originalUrl: url };
}
function isGoogleMapsUrl(s) { return /google\.(com|co\.\w+)\/maps|maps\.app\.goo\.gl/i.test(s); }
function buildMapQuery(n, l) { return encodeURIComponent([n, l].filter(Boolean).join(", ")); }
function countWords(s) { return s.trim() ? s.trim().split(/\s+/).length : 0; }

/* ═══════════════════════════════════════════════
   MEDIA CARDS
   ═══════════════════════════════════════════════ */

function BookCard({ media }) {
  const [coverErr, setCoverErr] = useState(false);
  const displayCover = !coverErr && media.cover;
  return (
    <a href={media.url} target="_blank" rel="noopener noreferrer"
      style={{ display: "flex", gap: "16px", textDecoration: "none", background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)", borderRadius: "16px", padding: "16px", border: "1px solid #FDE68A", transition: "transform 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = ""}>
      {displayCover
        ? <img src={media.cover} alt={media.title} onError={() => setCoverErr(true)} style={{ width: "80px", height: "120px", objectFit: "cover", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", flexShrink: 0 }} />
        : <div style={{ width: "80px", height: "120px", borderRadius: "10px", background: "linear-gradient(135deg, #D97706, #B45309)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", flexShrink: 0, color: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>📖</div>}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "10px", fontWeight: 600, color: "#B45309", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "6px" }}>
          📚 Book{media.isbn13 ? ` · ISBN ${media.isbn13}` : ""}
        </div>
        <div style={{ fontFamily: "'Instrument Serif'", fontSize: "18px", color: "#1a1a1a", lineHeight: 1.3, marginBottom: "2px" }}>{media.title}</div>
        {media.subtitle && <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#92400E", opacity: 0.8 }}>{media.subtitle}</div>}
        <div style={{ fontFamily: "'DM Sans'", fontSize: "13px", color: "#92400E" }}>{media.author}</div>
        {(media.pages || media.publishDate) && <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#B45309", marginTop: "4px", opacity: 0.7 }}>{media.pages && `${media.pages}p`}{media.pages && media.publishDate && " · "}{media.publishDate}</div>}
      </div>
    </a>
  );
}

function SpotifyCard({ media }) {
  const h = (media.contentType === "track" || media.contentType === "episode") ? 152 : 352;
  return (
    <div style={{ borderRadius: "16px", overflow: "hidden" }}>
      <iframe src={`https://open.spotify.com/embed/${media.contentType}/${media.spotifyId}?utm_source=generator&theme=0`}
        width="100%" height={h} frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style={{ borderRadius: "16px" }} />
    </div>
  );
}

function MovieCard({ media }) {
  return (
    <a href={media.url} target="_blank" rel="noopener noreferrer"
      style={{ display: "flex", gap: "16px", textDecoration: "none", background: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)", borderRadius: "16px", padding: "16px", border: "1px solid #FED7AA", transition: "transform 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = ""}>
      {media.poster
        ? <img src={media.poster} alt={media.title} style={{ width: "80px", height: "120px", objectFit: "cover", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", flexShrink: 0 }} />
        : <div style={{ width: "80px", height: "120px", borderRadius: "10px", background: "#EA580C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", flexShrink: 0 }}>🎥</div>}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "10px", fontWeight: 600, color: "#C2410C", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "6px" }}>🎥 Movie · TMDB {media.tmdbId}</div>
        <div style={{ fontFamily: "'Instrument Serif'", fontSize: "18px", color: "#1a1a1a", lineHeight: 1.3, marginBottom: "2px" }}>{media.title}</div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#9A3412" }}>{media.releaseDate}{media.rating ? ` · ⭐ ${media.rating}/10` : ""}</div>
        {media.overview && <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#78350F", marginTop: "6px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{media.overview}</div>}
      </div>
    </a>
  );
}

function YoutubeCard({ media }) {
  return (
    <div style={{ borderRadius: "16px", overflow: "hidden", position: "relative", paddingBottom: "56.25%", height: 0 }}>
      <iframe src={`https://www.youtube.com/embed/${media.youtubeId}`}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: "16px" }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
    </div>
  );
}

function ArticleCard({ media }) {
  return (
    <a href={media.url} target="_blank" rel="noopener noreferrer"
      style={{ display: "flex", alignItems: "center", gap: "14px", background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)", borderRadius: "16px", padding: "16px", textDecoration: "none", border: "1px solid #BFDBFE" }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>📝</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "10px", fontWeight: 600, color: "#1D4ED8", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px" }}>Article</div>
        <div style={{ fontFamily: "'Instrument Serif'", fontSize: "16px", color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{media.title}</div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#60A5FA", marginTop: "2px" }}>{media.displayUrl}</div>
      </div>
    </a>
  );
}

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
      </div>
      <div style={{ width: "100%", height: compact ? "140px" : "180px", borderTop: "1px solid #E9D5FF" }}>
        <iframe width="100%" height={compact ? "140" : "180"} frameBorder="0" style={{ border: 0, display: "block" }} loading="lazy" src={`https://www.google.com/maps?q=${mq}&output=embed`} allowFullScreen />
      </div>
      <a href={mapsLink} target="_blank" rel="noopener noreferrer"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", fontFamily: "'DM Sans'", fontSize: "12px", fontWeight: 500, color: "#7E22CE", textDecoration: "none", background: "rgba(126,34,206,0.04)", borderTop: "1px solid #E9D5FF" }}>
        Open in Google Maps ↗
      </a>
    </div>
  );
}

function MediaCard({ media, compact }) {
  if (!media) return null;
  if (media.type === "book")    return <BookCard media={media} />;
  if (media.type === "spotify" || media.type === "podcast") return <SpotifyCard media={media} />;
  if (media.type === "movie")   return <MovieCard media={media} />;
  if (media.type === "youtube") return <YoutubeCard media={media} />;
  if (media.type === "article") return <ArticleCard media={media} />;
  if (media.type === "place")   return <PlaceCard media={media} compact={compact} />;
  return null;
}

/* ═══════════════════════════════════════════════
   FLOATING REACTION
   ═══════════════════════════════════════════════ */
function FloatingReaction({ emoji, onComplete }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.95)", borderRadius: "20px", padding: "4px 10px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      <span style={{ fontSize: "16px" }}>{emoji}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   WORD-LIMITED TEXTAREA
   ═══════════════════════════════════════════════ */
function LimitedTextarea({ value, onChange, placeholder }) {
  const words = countWords(value);
  const over = words > MAX_WORDS;
  return (
    <div style={{ flex: 1 }}>
      <textarea value={value} onChange={e => { if (countWords(e.target.value) <= MAX_WORDS + 5) onChange(e.target.value); }} placeholder={placeholder} autoFocus
        style={{ width: "100%", border: "none", resize: "none", fontFamily: "'DM Sans'", fontSize: "15px", lineHeight: 1.6, outline: "none", minHeight: "80px", color: over ? "#DC2626" : "#1a1a1a" }} />
      <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: over ? "#DC2626" : words > MAX_WORDS * 0.8 ? "#F59E0B" : "#D1D5DB", textAlign: "right", marginTop: "-4px" }}>
        {words}/{MAX_WORDS} words
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PLACE LINKER
   ═══════════════════════════════════════════════ */
function PlaceLinker({ onAdd }) {
  const [mode, setMode] = useState(null);
  const [mapsUrl, setMapsUrl] = useState("");
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [location, setLocation] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [cf, setCf] = useState("");
  const [mq, setMq] = useState("");
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeResults, setPlaceResults] = useState(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const db = useRef(null);
  const handleUrlPaste = v => { setMapsUrl(v); if (isGoogleMapsUrl(v)) { const p = parseGoogleMapsUrl(v); if (p.name) setName(p.name); } };
  useEffect(() => {
    if (db.current) clearTimeout(db.current);
    db.current = setTimeout(() => { const q = [name, location].filter(s => s.trim()).join(", "); setMq(q.trim() ? encodeURIComponent(q) : ""); }, 600);
    return () => clearTimeout(db.current);
  }, [name, location]);
  const filtered = CUISINE_OPTIONS.filter(c => c.toLowerCase().includes(cf.toLowerCase()));
  const handleAdd = () => { if (!name.trim()) return; onAdd({ type: "place", name: name.trim(), cuisine: cuisine || null, location: location.trim() || null, mapsUrl: mapsUrl.trim() || null }); };

  const handlePlaceSearch = async () => {
    if (!placeSearch.trim()) return;
    setPlaceLoading(true);
    try {
      const data = await apiSearchPlaces(placeSearch);
      setPlaceResults(data.places || []);
    } catch { setPlaceResults([]); }
    setPlaceLoading(false);
  };

  const selectPlace = (place) => {
    onAdd({
      type: "place",
      name: place.displayName?.text || place.displayName || "Unknown",
      location: place.formattedAddress || null,
      cuisine: place.types?.[0]?.replace(/_/g, " ") || null,
      mapsUrl: place.googleMapsUri || null,
      placeId: place.id || null,
      rating: place.rating || null,
      lat: place.location?.latitude || null,
      lng: place.location?.longitude || null,
    });
  };

  const IS = { border: "1px solid #D1D5DB", borderRadius: "10px", padding: "10px 14px", fontFamily: "'DM Sans'", fontSize: "13px", outline: "none", background: "white", width: "100%" };

  if (!mode) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <button onClick={() => setMode("search")} style={{ background: "#FDF4FF", border: "1px solid #E9D5FF", borderRadius: "12px", padding: "14px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "24px" }}>🔍</span><div><div style={{ fontFamily: "'DM Sans'", fontSize: "14px", fontWeight: 600, color: "#7E22CE" }}>Search places</div><div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF" }}>Google Places powered</div></div>
      </button>
      <button onClick={() => setMode("url")} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "14px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "24px" }}>🔗</span><div><div style={{ fontFamily: "'DM Sans'", fontSize: "14px", fontWeight: 600, color: "#374151" }}>Paste Google Maps link</div><div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF" }}>Auto-fills place name</div></div>
      </button>
      <button onClick={() => setMode("manual")} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "14px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "24px" }}>✏️</span><div><div style={{ fontFamily: "'DM Sans'", fontSize: "14px", fontWeight: 600, color: "#374151" }}>Enter manually</div><div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF" }}>Type name, cuisine, location</div></div>
      </button>
    </div>
  );

  if (mode === "search") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        <input value={placeSearch} onChange={e => setPlaceSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePlaceSearch()} placeholder="e.g. Korean BBQ Chicago, Blue Bottle Tokyo..." style={IS} autoFocus />
        <button onClick={handlePlaceSearch} disabled={placeLoading} style={{ background: "#7E22CE", border: "none", borderRadius: "10px", padding: "10px 18px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: "white", fontWeight: 500, whiteSpace: "nowrap" }}>{placeLoading ? "..." : "Search"}</button>
      </div>
      {placeResults && placeResults.length === 0 && <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#9CA3AF", textAlign: "center", padding: "12px" }}>No results found</div>}
      {placeResults && placeResults.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "300px", overflowY: "auto" }}>
          {placeResults.slice(0, 6).map((p, i) => (
            <button key={i} onClick={() => selectPlace(p)} style={{ display: "flex", gap: "12px", alignItems: "center", background: "white", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "12px 14px", cursor: "pointer", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#7E22CE"} onMouseLeave={e => e.currentTarget.style.borderColor = "#E5E7EB"}>
              <span style={{ fontSize: "24px" }}>📍</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.displayName?.text || p.displayName}</div>
                <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.formattedAddress}{p.rating ? ` · ⭐ ${p.rating}` : ""}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      <button onClick={() => { setMode(null); setPlaceResults(null); setPlaceSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "12px", color: "#9CA3AF", alignSelf: "center" }}>← Back</button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {mode === "url" && <div><label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#7E22CE", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>Google Maps Link</label><input value={mapsUrl} onChange={e => handleUrlPaste(e.target.value)} placeholder="https://www.google.com/maps/place/..." style={IS} autoFocus /></div>}
      <div><label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>Place Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Blue Bottle Coffee" style={IS} autoFocus={mode === "manual"} /></div>
      <div style={{ position: "relative" }}>
        <label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>Cuisine / Type</label>
        <input value={cuisine || cf} onChange={e => { setCf(e.target.value); setCuisine(""); setShowDrop(true); }} onFocus={() => setShowDrop(true)} placeholder="e.g. Korean, Café..." style={IS} />
        {showDrop && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "white", borderRadius: "10px", border: "1px solid #E5E7EB", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", maxHeight: "160px", overflowY: "auto", marginTop: "4px" }}>
          {filtered.map(c => <button key={c} onClick={() => { setCuisine(c); setCf(""); setShowDrop(false); }} style={{ display: "block", width: "100%", padding: "8px 14px", border: "none", background: "white", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: "#374151", textAlign: "left" }}>{c}</button>)}
          {cf && !filtered.includes(cf) && <button onClick={() => { setCuisine(cf); setCf(""); setShowDrop(false); }} style={{ display: "block", width: "100%", padding: "8px 14px", border: "none", background: "white", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: "#7E22CE", textAlign: "left", borderTop: "1px solid #F3F4F6" }}>+ Use "{cf}"</button>}
        </div>}
      </div>
      <div><label style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", display: "block" }}>Town, Country</label><input value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} placeholder="e.g. Gangnam, Seoul" style={IS} /></div>
      {mq && <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #E9D5FF" }}>
        <div style={{ padding: "10px 14px", background: "#FDF4FF" }}>
          <div style={{ fontFamily: "'Instrument Serif'", fontSize: "16px", color: "#1a1a1a" }}>{name}</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
            {cuisine && <span style={{ fontFamily: "'DM Sans'", fontSize: "10px", background: "#E9D5FF", color: "#6B21A8", padding: "2px 8px", borderRadius: "6px" }}>🍽️ {cuisine}</span>}
            {location && <span style={{ fontFamily: "'DM Sans'", fontSize: "10px", background: "#F3E8FF", color: "#7E22CE", padding: "2px 8px", borderRadius: "6px" }}>📍 {location}</span>}
          </div>
        </div>
        <iframe width="100%" height="140" frameBorder="0" style={{ border: 0, display: "block" }} loading="lazy" src={`https://www.google.com/maps?q=${mq}&output=embed`} allowFullScreen />
      </div>}
      <button onClick={handleAdd} disabled={!name.trim()} style={{ background: name.trim() ? "#7E22CE" : "#D1D5DB", border: "none", borderRadius: "10px", padding: "10px 18px", cursor: name.trim() ? "pointer" : "default", fontFamily: "'DM Sans'", fontSize: "13px", color: "white", fontWeight: 600, alignSelf: "flex-end" }}>📍 Add place</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   REUSABLE RESULT PICKER
   ═══════════════════════════════════════════════ */
function ResultPicker({ title, items, onSelect, onReset, renderItem }) {
  return (
    <div style={{ background: "#F9FAFB", borderRadius: "14px", padding: "16px", border: "1px solid #E5E7EB" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 600, color: "#374151" }}>{title}</span>
        <button onClick={onReset} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "18px" }}>×</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((item, i) => (
          <button key={i} onClick={() => onSelect(item)}
            style={{ display: "flex", gap: "12px", alignItems: "center", background: "white", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "10px 14px", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#6B7280"} onMouseLeave={e => e.currentTarget.style.borderColor = "#E5E7EB"}>
            {renderItem(item)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   CONTENT LINKER
   ═══════════════════════════════════════════════ */
function ContentLinker({ onAdd }) {
  const [mode, setMode] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null); // { kind, items }
  const reset = () => { setMode(null); setError(""); setInput(""); setResults(null); };

  const detectUrlType = val => {
    if (parseSpotifyUrl(val)) return "spotify";
    if (parseYoutubeUrl(val)) return "youtube";
    if (/spotify\.com\/(show|episode)/i.test(val)) return "podcast";
    if (isGoogleMapsUrl(val)) return "place";
    if (/^https:\/\//i.test(val)) return "article";
    return null;
  };

  const handleUrlInput = val => {
    setInput(val); setError("");
    if (!mode || mode === "url") { const d = detectUrlType(val.trim()); if (d) setMode(d); }
  };

  const handleAdd = async () => {
    setError(""); setLoading(true); setResults(null);
    try {
      if (mode === "book") {
        const items = await searchBooks(input.trim());
        if (items.length === 1) { onAdd(items[0]); reset(); }
        else setResults({ kind: "book", items });
      } else if (mode === "spotify") {
        const p = parseSpotifyUrl(input);
        if (p) { onAdd({ type: "spotify", contentType: p.contentType, spotifyId: p.id, url: canonicalUrl(input) }); reset(); }
        else { const items = await searchMusic(input.trim()); setResults({ kind: "music", items }); }
      } else if (mode === "youtube") {
        const v = parseYoutubeUrl(input);
        if (v) { onAdd({ type: "youtube", youtubeId: v, url: `https://www.youtube.com/watch?v=${v}` }); reset(); }
        else throw new Error("Paste a YouTube video URL.");
      } else if (mode === "movie") {
        const items = await searchMovies(input.trim());
        if (items.length === 1) { onAdd(items[0]); reset(); }
        else setResults({ kind: "movie", items });
      } else if (mode === "podcast") {
        const p = parseSpotifyUrl(input);
        if (!p || !["episode","show"].includes(p.contentType)) throw new Error("Paste a Spotify podcast episode or show link.");
        onAdd({ type: "podcast", contentType: p.contentType, spotifyId: p.id, url: canonicalUrl(input) }); reset();
      } else if (mode === "article") {
        let u = input.trim();
        if (/^http:\/\//i.test(u)) u = u.replace(/^http:/i, "https:");
        else if (!/^https:\/\//i.test(u)) u = "https://" + u;
        const cu = canonicalUrl(u);
        const t = await fetchArticleTitle(cu);
        let d; try { d = new URL(cu).hostname; } catch { d = cu; }
        onAdd({ type: "article", url: cu, title: t, displayUrl: d }); reset();
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // ── Result pickers ──
  if (results?.kind === "book") return (
    <ResultPicker title="📚 Pick the right book" items={results.items} onReset={reset} onSelect={item => { onAdd(item); reset(); }}
      renderItem={b => (<>
        {b.cover ? <img src={b.cover} alt={b.title} style={{ width: "36px", height: "54px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }} /> : <div style={{ width: "36px", height: "54px", borderRadius: "6px", background: "#FDE68A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>📖</div>}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#6B7280" }}>{b.author}{b.publishDate ? ` · ${b.publishDate.slice(0,4)}` : ""} · {b.isbn13 || "no ISBN-13"}</div>
        </div>
      </>)}
    />
  );

  if (results?.kind === "music") return (
    <ResultPicker title="🎵 Pick a song" items={results.items} onReset={reset} onSelect={item => { onAdd(item); reset(); }}
      renderItem={t => (<>
        {t.artwork ? <img src={t.artwork} alt={t.title} style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: "44px", height: "44px", borderRadius: "8px", background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>🎵</div>}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#6B7280" }}>{t.artist}{t.album ? ` · ${t.album}` : ""}{t.releaseDate ? ` · ${t.releaseDate}` : ""}</div>
        </div>
      </>)}
    />
  );

  if (results?.kind === "movie") return (
    <ResultPicker title="🎥 Pick a movie" items={results.items} onReset={reset} onSelect={item => { onAdd(item); reset(); }}
      renderItem={m => (<>
        {m.poster ? <img src={m.poster} alt={m.title} style={{ width: "36px", height: "54px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }} /> : <div style={{ width: "36px", height: "54px", borderRadius: "6px", background: "#FED7AA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🎥</div>}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#6B7280" }}>{m.releaseDate}{m.rating ? ` · ⭐ ${m.rating}` : ""} · TMDB {m.tmdbId}</div>
        </div>
      </>)}
    />
  );

  // Default: smart URL paste + type picker
  if (!mode) return (
    <div>
      <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>What are you sharing?</div>
      <div style={{ marginBottom: "12px", background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "12px", padding: "12px" }}>
        <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#0369A1", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>🔗 Paste any URL to auto-detect</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={input} onChange={e => handleUrlInput(e.target.value)} onKeyDown={e => e.key === "Enter" && input.trim() && handleAdd()}
            placeholder="Spotify, YouTube, article (https only)..." autoFocus
            style={{ flex: 1, border: "1px solid #BAE6FD", borderRadius: "8px", padding: "8px 12px", fontFamily: "'DM Sans'", fontSize: "13px", outline: "none", background: "white" }} />
          {input.trim() && <button onClick={handleAdd} disabled={loading} style={{ background: "#0369A1", border: "none", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: "white", fontWeight: 500 }}>{loading ? "..." : "Add"}</button>}
        </div>
        {error && <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#DC2626", marginTop: "6px" }}>{error}</div>}
      </div>
      <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF", marginBottom: "8px", textAlign: "center" }}>— or choose a type —</div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {MEDIA_TYPES.map(t => (
          <button key={t.key} onClick={() => { setMode(t.key); setInput(""); setError(""); }}
            style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "10px 14px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: t.text, fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
    </div>
  );

  const ti = MEDIA_TYPES.find(t => t.key === mode);
  const placeholders = {
    book:    "Title, author, or ISBN-13 — e.g. \"Digital Minimalism\" or 9780525536512",
    spotify: "Artist or song title — e.g. \"Radiohead\" or \"Karma Police\"",
    movie:   "Movie title — e.g. \"Parasite\" or \"Everything Everywhere\"",
    podcast: "Paste Spotify podcast episode/show link (https only)",
    article: "Paste article URL (https only)",
  };
  const btnLabel = () => {
    if (loading) return "...";
    if ((mode === "spotify" && !parseSpotifyUrl(input)) || mode === "movie") return "Search";
    return "Add";
  };
  return (
    <div style={{ background: "#F9FAFB", borderRadius: "14px", padding: "16px", border: "1px solid #E5E7EB" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontSize: "16px" }}>{ti?.icon}</span>
        <span style={{ fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 600, color: "#374151" }}>{ti?.label}</span>
        <button onClick={reset} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "18px" }}>×</button>
      </div>
      {mode === "place" ? <PlaceLinker onAdd={m => { onAdd(m); reset(); }} /> : (
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={input}
            onChange={e => { setInput(e.target.value); setError(""); if (["spotify","youtube","podcast","article"].includes(mode)) handleUrlInput(e.target.value); }}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder={placeholders[mode] || "Enter value"} autoFocus
            style={{ flex: 1, border: "1px solid #D1D5DB", borderRadius: "10px", padding: "10px 14px", fontFamily: "'DM Sans'", fontSize: "13px", outline: "none", background: "white" }} />
          <button onClick={handleAdd} disabled={!input.trim() || loading}
            style={{ background: input.trim() && !loading ? "#1a1a1a" : "#D1D5DB", border: "none", borderRadius: "10px", padding: "10px 18px", cursor: input.trim() && !loading ? "pointer" : "default", fontFamily: "'DM Sans'", fontSize: "13px", color: "white", fontWeight: 500 }}>
            {btnLabel()}
          </button>
        </div>
      )}
      {error && <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#DC2626", marginTop: "8px", padding: "6px 10px", background: "#FEF2F2", borderRadius: "8px" }}>{error}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   POST
   ═══════════════════════════════════════════════ */
function Post({ post, onAddReaction, onRemoveReaction, onViewItem, onSave, savedIds }) {
  const [showReactions, setShowReactions] = useState(false);
  const [copied, setCopied] = useState(false);
  const isSaved = savedIds?.has(post.id);
  const handleShare = () => {
    const url = window.location.origin + window.location.pathname + `#post-${post.id}`;
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <article style={{ background: "white", borderRadius: "24px", padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.04)", animation: "fadeSlideUp 0.4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: post.author?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>{post.author?.emoji}</div>
        <div style={{ flex: 1 }}><div style={{ fontFamily: "'DM Sans'", fontWeight: 600, fontSize: "15px", color: "#1a1a1a" }}>{post.author?.name}</div><div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#9CA3AF" }}>{post.time}</div></div>
        <div style={{ display: "flex", gap: "4px" }}>
          <button onClick={handleShare} title="Copy link" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px", opacity: 0.5 }}>{copied ? "✅" : "🔗"}</button>
          {post.author?.name !== CURRENT_USER.name && (
            <button onClick={() => onSave?.(post)} title={isSaved ? "Saved" : "Save"} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px", opacity: isSaved ? 1 : 0.5 }}>{isSaved ? "🔖" : "📌"}</button>
          )}
        </div>
      </div>
      <p style={{ fontFamily: "'DM Sans'", fontSize: "15px", lineHeight: 1.65, color: "#374151", margin: "0 0 18px 0" }}>{post.text}</p>
      {post.media && <div style={{ marginBottom: "18px", cursor: "pointer" }} onClick={() => onViewItem(getMediaKey(post.media))}><MediaCard media={post.media} compact /></div>}
      {post.reactions.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>{post.reactions.map(r => <FloatingReaction key={r.id} emoji={r.emoji} onComplete={() => onRemoveReaction(post.id, r.id)} />)}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingTop: "14px", borderTop: "1px solid #F3F4F6", position: "relative" }}>
        <button onClick={() => setShowReactions(!showReactions)} style={{ background: showReactions ? "#FEF2F2" : "#F9FAFB", border: "none", borderRadius: "12px", padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: showReactions ? "#E8453C" : "#6B7280", fontWeight: 500 }}>😊 React</button>
        {post.media && <button onClick={() => onViewItem(getMediaKey(post.media))} style={{ marginLeft: "auto", background: "#F9FAFB", border: "none", borderRadius: "12px", padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>View all thoughts →</button>}
        {showReactions && <div style={{ position: "absolute", bottom: "48px", left: 0, background: "white", borderRadius: "18px", padding: "8px 10px", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", display: "flex", gap: "4px", animation: "fadeSlideUp 0.2s ease", zIndex: 10 }}>{REACTION_EMOJIS.map(emoji => <button key={emoji} onClick={() => { onAddReaction(post.id, emoji); setShowReactions(false); }} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", padding: "6px", borderRadius: "10px" }}>{emoji}</button>)}</div>}
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════
   ITEM DETAIL PAGE
   ═══════════════════════════════════════════════ */
function ItemDetailPage({ mediaKey, posts, onBack, onAddReaction, onRemoveReaction }) {
  const relatedPosts = posts.filter(p => getMediaKey(p.media) === mediaKey);
  const media = relatedPosts[0]?.media;
  if (!media) return null;
  return (
    <div style={{ animation: "fadeSlideUp 0.3s ease" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "14px", color: "#6B7280", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>← Back to feed</button>
      <div style={{ background: "white", borderRadius: "24px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)", marginBottom: "16px" }}>
        <MediaCard media={media} />
        <div style={{ marginTop: "12px", fontFamily: "'DM Sans'", fontSize: "13px", color: "#9CA3AF" }}>{relatedPosts.length} thought{relatedPosts.length !== 1 ? "s" : ""}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {relatedPosts.map(post => (
          <div key={post.id} style={{ background: "white", borderRadius: "20px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: post.author.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{post.author.emoji}</div>
              <div><div style={{ fontFamily: "'DM Sans'", fontWeight: 600, fontSize: "14px", color: "#1a1a1a" }}>{post.author.name}</div><div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF" }}>{post.time}</div></div>
            </div>
            <p style={{ fontFamily: "'DM Sans'", fontSize: "14px", lineHeight: 1.6, color: "#374151", margin: 0 }}>{post.text}</p>
            {post.reactions.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>{post.reactions.map(r => <FloatingReaction key={r.id} emoji={r.emoji} onComplete={() => onRemoveReaction(post.id, r.id)} />)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   COMPOSE MODAL
   ═══════════════════════════════════════════════ */
function ComposeModal({ onClose, onPublish, dailyCount }) {
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const canPublish = text.trim() && countWords(text) <= MAX_WORDS && media && dailyCount < 5;
  const atLimit = dailyCount >= 5;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, animation: "fadeIn 0.2s ease" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: "28px", padding: "32px", width: "92%", maxWidth: "560px", boxShadow: "0 24px 64px rgba(0,0,0,0.15)", animation: "fadeSlideUp 0.3s ease", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "'Instrument Serif'", fontSize: "24px", margin: 0 }}>Share something</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: atLimit ? "#DC2626" : "#9CA3AF", fontWeight: 500 }}>{dailyCount}/5 today</span>
            <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", width: "36px", height: "36px", borderRadius: "12px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>×</button>
          </div>
        </div>
        {atLimit ? (
          <div style={{ textAlign: "center", padding: "32px 20px", fontFamily: "'DM Sans'" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🚫</div>
            <div style={{ fontSize: "15px", color: "#DC2626", fontWeight: 600 }}>Daily limit reached</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "4px" }}>You can share up to 5 items per day. Come back tomorrow!</div>
          </div>
        ) : (<>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "4px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: CURRENT_USER.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>{CURRENT_USER.emoji}</div>
            <LimitedTextarea value={text} onChange={setText} placeholder="Share your thoughts..." />
          </div>
          {(!text.trim() || !media) && <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#9CA3AF", marginBottom: "12px", padding: "8px 12px", background: "#F9FAFB", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px" }}><span>💡</span>{!media && !text.trim() ? "Add an item and share your thoughts" : !media ? "Now link an item below" : "Write your thoughts to publish"}</div>}
          {media && <div style={{ position: "relative", marginBottom: "16px" }}><MediaCard media={media} compact /><button onClick={() => setMedia(null)} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", border: "none", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", color: "white", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button></div>}
          {!media && <div style={{ paddingTop: "16px", borderTop: "1px solid #F3F4F6", marginBottom: "20px" }}><ContentLinker onAdd={m => setMedia(m)} /></div>}
          <button onClick={() => { if (canPublish) { onPublish(text, media); onClose(); } }} disabled={!canPublish}
            style={{ width: "100%", background: canPublish ? "#1a1a1a" : "#E5E7EB", border: "none", borderRadius: "14px", padding: "14px", cursor: canPublish ? "pointer" : "default", fontFamily: "'DM Sans'", fontSize: "15px", color: canPublish ? "white" : "#9CA3AF", fontWeight: 600 }}>
            {canPublish ? "Publish" : countWords(text) > MAX_WORDS ? `Over ${MAX_WORDS} word limit` : "Add item + thoughts to publish"}
          </button>
        </>)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SEARCH BAR
   ═══════════════════════════════════════════════ */
function SearchBar({ query, onQueryChange, activeFilter, onFilterChange }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ position: "relative", marginBottom: "12px" }}>
        <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", color: "#9CA3AF" }}>🔍</span>
        <input value={query} onChange={e => onQueryChange(e.target.value)} placeholder="Search books, music, movies, places..."
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
            whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.15s",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   GROUP SELECTOR
   ═══════════════════════════════════════════════ */
function GroupSelector({ activeGroup, onGroupChange, randomMembers, similarMembers, clubData, excludedUsers, onExcludeUser, onRefreshRandom, onSelectClubItem }) {
  const t = useT();
  const groups = [
    { key: "random", icon: "🎲", label: t.randomCircle, desc: `${randomMembers.length} ${t.members}`, color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
    { key: "similar", icon: "🔗", label: t.sharedTaste, desc: `${similarMembers.length} ${t.matches}`, color: "#8B5CF6", bg: "#FDF4FF", border: "#E9D5FF" },
    { key: "club", icon: "📖", label: t.club, desc: t.readTogether, color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  ];
  const [showMembers, setShowMembers] = useState(false);
  const currentMembers = activeGroup === "random" ? randomMembers : activeGroup === "similar" ? similarMembers : clubData.members;

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        {groups.map(g => (
          <button key={g.key} onClick={() => onGroupChange(g.key)}
            style={{ flex: 1, padding: "12px 10px", borderRadius: "14px", cursor: "pointer", background: activeGroup === g.key ? g.bg : "white", border: `2px solid ${activeGroup === g.key ? g.color : "#E5E7EB"}`, transition: "all 0.2s", textAlign: "center" }}>
            <div style={{ fontSize: "20px", marginBottom: "4px" }}>{g.icon}</div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: "12px", fontWeight: 600, color: activeGroup === g.key ? g.color : "#374151" }}>{g.label}</div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: "10px", color: "#9CA3AF" }}>{g.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: "14px", padding: "12px 16px", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "flex" }}>
            {currentMembers.slice(0, 5).map((m, i) => (
              <div key={m.name} style={{ width: "28px", height: "28px", borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", border: "2px solid white", marginLeft: i > 0 ? "-8px" : 0, zIndex: 5 - i }}>{m.emoji}</div>
            ))}
          </div>
          <span style={{ fontFamily: "'DM Sans'", fontSize: "12px", color: "#6B7280" }}>
            {currentMembers.map(m => m.name).join(", ") || "No members yet"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {(activeGroup === "random" || activeGroup === "similar") && (
            <button onClick={onRefreshRandom} style={{ background: "#F3F4F6", border: "none", borderRadius: "8px", padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "11px", color: "#6B7280" }} title="Refresh">🔄</button>
          )}
          <button onClick={() => setShowMembers(!showMembers)} style={{ background: "#F3F4F6", border: "none", borderRadius: "8px", padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "11px", color: "#6B7280" }}>{showMembers ? t.hide : t.manage}</button>
        </div>
      </div>

      {showMembers && (
        <div style={{ background: "white", borderRadius: "14px", padding: "12px", border: "1px solid #E5E7EB", marginTop: "8px" }}>
          {activeGroup === "similar" && (
            <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF", marginBottom: "8px" }}>
              People who shared the same items as you. Exclude anyone you don't want to see.
            </div>
          )}
          {activeGroup === "club" && clubData.picks?.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#059669", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>📖 This Week's Picks — choose one:</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {clubData.picks.map(pick => (
                  <button key={pick.id} onClick={() => onSelectClubItem?.(pick.mediaKey)}
                    style={{ background: clubData.recommendedKey === pick.mediaKey ? "#ECFDF5" : "white", border: `1px solid ${clubData.recommendedKey === pick.mediaKey ? "#059669" : "#E5E7EB"}`, borderRadius: "10px", padding: "8px 12px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "12px", color: "#374151", textAlign: "left" }}>
                    <div style={{ fontWeight: 600 }}>{pick.media?.title || pick.mediaKey}</div>
                    <div style={{ fontSize: "10px", color: "#9CA3AF" }}>{pick.mediaType}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {currentMembers.length === 0 && (
            <div style={{ fontFamily: "'DM Sans'", fontSize: "13px", color: "#9CA3AF", textAlign: "center", padding: "16px" }}>
              {activeGroup === "similar" ? t.shareMore : activeGroup === "club" ? "Choose a pick above to see members" : "No members in this group"}
            </div>
          )}
          {currentMembers.map(m => (
            <div key={m.name} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 4px", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>{m.emoji}</div>
              <span style={{ fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 500, color: "#1a1a1a", flex: 1 }}>{m.name}</span>
              {activeGroup === "similar" && (
                <button onClick={() => onExcludeUser(m.name)} style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "11px", color: "#DC2626" }}>{t.exclude}</button>
              )}
            </div>
          ))}
          {activeGroup === "similar" && excludedUsers.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>{t.excluded}:</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {excludedUsers.map(name => (
                  <button key={name} onClick={() => onExcludeUser(name)} style={{ background: "#F3F4F6", border: "none", borderRadius: "8px", padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "11px", color: "#6B7280", textDecoration: "line-through" }}>{name} ✕</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   API HELPERS
   ═══════════════════════════════════════════════ */
function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr + (dateStr.endsWith("Z") ? "" : "Z")); // ensure UTC
  const diff = Math.max(0, now - d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

async function fetchPosts() {
  try {
    const res = await fetch(`${WORKER_URL}/posts`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) { console.error("fetchPosts failed:", res.status); return []; }
    const data = await res.json();
    return data.map(p => ({
      id: p.id,
      author: p.author,
      time: timeAgo(p.createdAt),
      text: p.text,
      media: p.media,
      reactions: p.reactions || [],
    }));
  } catch (err) { console.error("fetchPosts error:", err); return []; }
}

async function apiAddReaction(postId, emoji, userName) {
  try {
    await fetch(`${WORKER_URL}/posts/${postId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji, userName }),
    });
  } catch {}
}

async function apiCreatePost(author, text, media, mediaKey) {
  const res = await fetch(`${WORKER_URL}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ author, text, media, mediaKey }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("apiCreatePost failed:", res.status, errText);
    throw new Error(errText || "Failed to create post");
  }
  return res.json();
}

async function apiGetDailyCount(userName) {
  try {
    const res = await fetch(`${WORKER_URL}/posts/count?user=${encodeURIComponent(userName)}`);
    if (res.ok) return (await res.json()).count || 0;
  } catch {}
  return 0;
}

async function apiSavePost(userName, postId, mediaType, mediaData) {
  const res = await fetch(`${WORKER_URL}/saves`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName, postId, mediaType, mediaData }),
  });
  if (!res.ok) throw new Error("Save failed");
  return res.json();
}

async function apiGetSaves(userName) {
  try {
    const res = await fetch(`${WORKER_URL}/saves?user=${encodeURIComponent(userName)}`);
    if (res.ok) return res.json();
  } catch {}
  return [];
}

async function apiDeleteSave(saveId) {
  await fetch(`${WORKER_URL}/saves/${saveId}`, { method: "DELETE" });
}

async function apiGetClubPicks() {
  try {
    const res = await fetch(`${WORKER_URL}/club/picks`);
    if (res.ok) return res.json();
  } catch {}
  return [];
}

async function apiSearchPlaces(query) {
  const res = await fetch(`${WORKER_URL}/places/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Places search failed");
  return res.json();
}

async function apiAutocompletePlaces(query) {
  const res = await fetch(`${WORKER_URL}/places/autocomplete?q=${encodeURIComponent(query)}`);
  if (!res.ok) return { suggestions: [] };
  return res.json();
}

/* ═══════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════ */
export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [page, setPage] = useState("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewingItem, setViewingItem] = useState(null);
  const [activeGroup, setActiveGroup] = useState("random");
  const [excludedUsers, setExcludedUsers] = useState([]);
  const [clubItem, setClubItem] = useState(null);
  const [clubPicks, setClubPicks] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [dailyCount, setDailyCount] = useState(0);
  const [lang, setLang] = useState("en");
  const [bgKey, setBgKey] = useState("warm");
  const [showSettings, setShowSettings] = useState(false);
  const rIdRef = useRef(100);
  const bgTheme = BG_COLORS.find(b => b.key === bgKey) || BG_COLORS[0];
  const isDark = bgKey === "dark";

  // Load posts from API on mount + auto-refresh every 5min
  useEffect(() => {
    let active = true;
    const load = async () => {
      const data = await fetchPosts();
      if (active) { setPosts(data); setLoading(false); }
    };
    load();
    const interval = setInterval(load, 300000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Load saves and daily count and club picks on mount
  useEffect(() => {
    apiGetSaves(CURRENT_USER.name).then(saves => setSavedIds(new Set(saves.map(s => s.postId))));
    apiGetDailyCount(CURRENT_USER.name).then(c => setDailyCount(c));
    apiGetClubPicks().then(picks => setClubPicks(picks));
  }, []);

  const addReaction = useCallback((postId, emoji) => {
    const id = ++rIdRef.current;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const filtered = p.reactions.filter(r => r.userId !== CURRENT_USER.name);
      return { ...p, reactions: [...filtered, { id, emoji, userId: CURRENT_USER.name }] };
    }));
    // Fire-and-forget to API
    apiAddReaction(postId, emoji, CURRENT_USER.name);
  }, []);
  const removeReaction = useCallback((postId, rid) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: p.reactions.filter(r => r.id !== rid) } : p));
  }, []);
  const publishPost = useCallback(async (text, media) => {
    if (dailyCount >= 5) return;
    const tempId = "temp-" + Date.now();
    const mediaKey = getMediaKey(media);
    setPosts(prev => [{ id: tempId, author: CURRENT_USER, time: "just now", text, media, reactions: [] }, ...prev]);
    try {
      const result = await apiCreatePost(CURRENT_USER, text, media, mediaKey);
      setPosts(prev => prev.map(p => p.id === tempId ? { ...p, id: result.id } : p));
      setDailyCount(c => c + 1);
    } catch (err) {
      console.error("publishPost error:", err);
      if (err.message?.includes("Daily limit")) setDailyCount(5);
    }
  }, [dailyCount]);

  const savePost = useCallback(async (post) => {
    if (savedIds.has(post.id)) return;
    try {
      await apiSavePost(CURRENT_USER.name, post.id, post.media?.type, post.media);
      setSavedIds(prev => new Set([...prev, post.id]));
    } catch (err) { console.error("savePost error:", err); }
  }, [savedIds]);

  // ── Group membership logic ──
  const [randomSeed, setRandomSeed] = useState(0);
  const randomGroupMembers = useMemo(() => {
    const allUsers = AVATARS.filter(a => a.name !== CURRENT_USER.name);
    const shuffled = [...allUsers].sort((a, b) => {
      const ha = (a.name.charCodeAt(0) * 31 + a.name.charCodeAt(1) + randomSeed) % 100;
      const hb = (b.name.charCodeAt(0) * 31 + b.name.charCodeAt(1) + randomSeed) % 100;
      return ha - hb;
    });
    return shuffled.slice(0, 4);
  }, [randomSeed]);

  // Similar group: people who share the same items as you
  const similarGroupMembers = useMemo(() => {
    const myMediaKeys = new Set(posts.filter(p => p.author?.name === CURRENT_USER.name).map(p => getMediaKey(p.media)).filter(Boolean));
    const userOverlap = {};
    posts.forEach(p => {
      if (p.author?.name === CURRENT_USER.name) return;
      const key = getMediaKey(p.media);
      if (key && myMediaKeys.has(key)) {
        userOverlap[p.author.name] = (userOverlap[p.author.name] || 0) + 1;
      }
    });
    return AVATARS.filter(a => a.name !== CURRENT_USER.name && userOverlap[a.name] && !excludedUsers.includes(a.name))
      .sort((a, b) => (userOverlap[b.name] || 0) - (userOverlap[a.name] || 0));
  }, [posts, excludedUsers]);

  // Club: weekly picks from API + users who posted about picked items
  const clubData = useMemo(() => {
    const selectedKey = clubItem || (clubPicks[0]?.mediaKey || null);
    // Find users who posted about the selected club item
    const clubMembers = [];
    if (selectedKey) {
      const memberNames = new Set();
      posts.forEach(p => {
        if (getMediaKey(p.media) === selectedKey && p.author?.name !== CURRENT_USER.name) {
          memberNames.add(p.author.name);
        }
      });
      memberNames.forEach(name => {
        const avatar = AVATARS.find(a => a.name === name);
        if (avatar) clubMembers.push(avatar);
      });
    }
    return { recommendedKey: selectedKey, members: clubMembers, picks: clubPicks };
  }, [posts, clubItem, clubPicks]);

  const filteredPosts = useMemo(() => {
    let result = posts;

    // ── Group filtering (feed page only — search page shows all) ──
    if (page === "feed") {
      if (activeGroup === "random") {
        const names = new Set([CURRENT_USER.name, ...randomGroupMembers.map(m => m.name)]);
        result = result.filter(p => names.has(p.author?.name));
      } else if (activeGroup === "similar") {
        const names = new Set([CURRENT_USER.name, ...similarGroupMembers.map(m => m.name)]);
        result = result.filter(p => names.has(p.author?.name));
      } else if (activeGroup === "club") {
        const names = new Set([CURRENT_USER.name, ...clubData.members.map(m => m.name)]);
        result = result.filter(p => names.has(p.author?.name));
        if (clubData.recommendedKey) {
          result = result.sort((a, b) => {
            const aMatch = getMediaKey(a.media) === clubData.recommendedKey ? 1 : 0;
            const bMatch = getMediaKey(b.media) === clubData.recommendedKey ? 1 : 0;
            return bMatch - aMatch;
          });
        }
      }
    }

    // Type filter
    if (activeFilter !== "all") {
      result = result.filter(p => {
        if (activeFilter === "spotify") return p.media?.type === "spotify";
        return p.media?.type === activeFilter;
      });
    }
    // Search — tokenized keyword matching (each word must match somewhere)
    if (searchQuery.trim()) {
      const tokens = searchQuery.toLowerCase().split(/[\s,]+/).filter(Boolean);
      result = result.filter(p => {
        const m = p.media;
        if (!m) return false;
        const fields = [
          m.title, m.subtitle, m.author, m.isbn13,
          ...(m.categories || []),
          m.artist, m.album, m.genre,
          m.overview, m.channel,
          m.name, m.cuisine, m.location,
          m.displayUrl, m.releaseDate, m.tmdbId,
          p.text,
        ].filter(Boolean).join(" ").toLowerCase();
        return tokens.every(t => fields.includes(t));
      });
    }
    return result;
  }, [posts, activeFilter, searchQuery, page, activeGroup, randomGroupMembers, similarGroupMembers, clubData, excludedUsers]);

  const handleViewItem = key => { setViewingItem(key); setPage("item"); };
  const t = LANG[lang] || LANG.en;

  return (
    <LangContext.Provider value={lang}>
      <style>{FONTS_CSS}{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${isDark ? "#1a1a2e" : "#F5F3EF"}; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        ::selection { background: #E8453C22; }
        input::placeholder, textarea::placeholder { color: #9CA3AF; }
        ::-webkit-scrollbar { height: 4px; } ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 2px; }
      `}</style>
      <div style={{ minHeight: "100vh", background: bgTheme.bg }}>
        <header style={{ position: "sticky", top: 0, zIndex: 50, background: bgTheme.headerBg, backdropFilter: "blur(16px)", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`, padding: "16px 24px" }}>
          <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 onClick={() => { setPage("feed"); setViewingItem(null); }} style={{ fontFamily: "'Bungee'", fontSize: "24px", color: isDark ? "#F9FAFB" : "#1a1a1a", fontWeight: 400, cursor: "pointer", letterSpacing: "1px" }}>commune</h1>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button onClick={() => setShowSettings(!showSettings)} style={{ background: showSettings ? (isDark ? "#374151" : "#1a1a1a") : (isDark ? "#374151" : "#F3F4F6"), color: showSettings ? "white" : (isDark ? "#D1D5DB" : "#6B7280"), border: "none", borderRadius: "12px", padding: "8px 12px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px" }}>⚙️</button>
              <button onClick={() => setPage(page === "search" ? "feed" : "search")} style={{ background: page === "search" ? "#1a1a1a" : (isDark ? "#374151" : "#F3F4F6"), color: page === "search" ? "white" : (isDark ? "#D1D5DB" : "#6B7280"), border: "none", borderRadius: "12px", padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 500 }}>🔍 {t.discover}</button>
              <button onClick={() => setComposing(true)} style={{ background: "#E8453C", border: "none", borderRadius: "14px", padding: "8px 18px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", color: "white", fontWeight: 500 }}>+ {t.share}</button>
            </div>
          </div>
          {showSettings && (
            <div style={{ maxWidth: "600px", margin: "12px auto 0", background: isDark ? "#1f2937" : "white", borderRadius: "16px", padding: "16px", border: `1px solid ${isDark ? "#374151" : "#E5E7EB"}`, animation: "fadeSlideUp 0.2s ease" }}>
              <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>{t.language}</div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[["en", "EN"], ["ko", "한"]].map(([k, label]) => (
                      <button key={k} onClick={() => setLang(k)} style={{ background: lang === k ? "#1a1a1a" : (isDark ? "#374151" : "#F3F4F6"), color: lang === k ? "white" : (isDark ? "#D1D5DB" : "#6B7280"), border: "none", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 600 }}>{label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>{t.background}</div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {BG_COLORS.map(b => (
                      <button key={b.key} onClick={() => setBgKey(b.key)} style={{ width: "28px", height: "28px", borderRadius: "50%", background: b.bg, border: bgKey === b.key ? "3px solid #E8453C" : `2px solid ${isDark ? "#4B5563" : "#D1D5DB"}`, cursor: "pointer" }} title={b.label} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>

        <main style={{ maxWidth: "600px", margin: "20px auto", padding: "0 16px 60px" }}>
          {page === "search" && <SearchBar query={searchQuery} onQueryChange={setSearchQuery} activeFilter={activeFilter} onFilterChange={setActiveFilter} />}
          {page === "item" && viewingItem && <ItemDetailPage mediaKey={viewingItem} posts={posts} onBack={() => { setPage("feed"); setViewingItem(null); }} onAddReaction={addReaction} onRemoveReaction={removeReaction} />}
          {page !== "item" && (
            <>
              {page === "feed" && (
                <GroupSelector
                  activeGroup={activeGroup} onGroupChange={setActiveGroup}
                  randomMembers={randomGroupMembers} similarMembers={similarGroupMembers}
                  clubData={clubData} excludedUsers={excludedUsers}
                  onExcludeUser={name => setExcludedUsers(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])}
                  onRefreshRandom={() => setRandomSeed(s => s + 1)}
                  onSelectClubItem={key => setClubItem(key)}
                />
              )}
              {page === "search" && searchQuery && filteredPosts.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", fontFamily: "'DM Sans'", color: "#9CA3AF" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
                  <div style={{ fontSize: "15px" }}>{t.noResults} "{searchQuery}"</div>
                  <div style={{ fontSize: "13px", marginTop: "4px" }}>{t.tryDifferent}</div>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {loading && (
                  <div style={{ textAlign: "center", padding: "40px 20px", fontFamily: "'DM Sans'", color: "#9CA3AF" }}>
                    <div style={{ fontSize: "24px", marginBottom: "8px", animation: "fadeIn 0.5s ease infinite alternate" }}>⏳</div>
                    <div style={{ fontSize: "14px" }}>{t.loading}</div>
                  </div>
                )}
                {!loading && filteredPosts.map(post => (
                  <Post key={post.id} post={post} onAddReaction={addReaction} onRemoveReaction={removeReaction} onViewItem={handleViewItem} onSave={savePost} savedIds={savedIds} />
                ))}
                {!loading && page === "feed" && filteredPosts.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 20px", fontFamily: "'DM Sans'", color: "#9CA3AF" }}>
                    <div style={{ fontSize: "40px", marginBottom: "12px" }}>{activeGroup === "similar" ? "🔗" : "🎲"}</div>
                    <div style={{ fontSize: "15px" }}>{t.noPostsGroup}</div>
                    <div style={{ fontSize: "13px", marginTop: "4px" }}>{activeGroup === "similar" ? t.shareMore : t.beFirst}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
      {composing && <ComposeModal onClose={() => setComposing(false)} onPublish={publishPost} dailyCount={dailyCount} />}
    </LangContext.Provider>
  );
}
