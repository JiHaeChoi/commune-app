/**
 * commune-api v2 — Cloudflare Worker + D1
 *
 * Posts/Reactions: 7-day TTL (visible), archived permanently for grouping
 * Daily limit: 5 posts per user per day
 *
 * Endpoints:
 *   GET  /spotify/search?q=...         → Spotify Search
 *   GET  /nl/search?isbn=...           → Korean National Library
 *   GET  /places/search?q=...          → Google Places text search
 *   GET  /places/autocomplete?q=...    → Google Places autocomplete
 *   GET  /posts                        → List posts (last 7 days)
 *   POST /posts                        → Create post (max 5/day)
 *   POST /posts/:id/reactions          → Add/replace reaction
 *   DELETE /posts/:id                  → Delete post
 *   GET  /posts/count?user=...         → Today's post count for user
 *   POST /saves                        → Save a post
 *   GET  /saves?user=...               → Get user's saved items
 *   DELETE /saves/:id                  → Remove saved item
 *   GET  /club/picks                   → This week's club picks
 *   POST /club/picks                   → Generate weekly picks (cron)
 *   GET  /archive?user=...             → Get user's archive (for grouping)
 *   GET  /archive/overlap?u1=...&u2=.. → Taste overlap between users
 *   POST /cleanup                      → Archive old posts, delete from active
 *   GET  /health                       → Health check
 *
 * Bindings: D1:COMMUNE_DB, Vars: SPOTIFY_*, NL_API_KEY, GOOGLE_PLACES_KEY, ALLOWED_ORIGIN
 */

let spotifyToken = null;
let spotifyTokenExpiry = 0;

async function getSpotifyToken(env) {
  if (spotifyToken && Date.now() < spotifyTokenExpiry) return spotifyToken;
  const cred = btoa(env.SPOTIFY_CLIENT_ID + ":" + env.SPOTIFY_CLIENT_SECRET);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + cred },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Spotify token failed (${res.status})`);
  const d = await res.json();
  spotifyToken = d.access_token;
  spotifyTokenExpiry = Date.now() + (d.expires_in - 120) * 1000;
  return spotifyToken;
}

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status, h) {
  return new Response(JSON.stringify(data), { status, headers: { ...h, "Content-Type": "application/json; charset=utf-8" } });
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function matchRoute(path, pattern) {
  const pp = pattern.split("/"), pa = path.split("/");
  if (pp.length !== pa.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":")) params[pp[i].slice(1)] = pa[i];
    else if (pp[i] !== pa[i]) return null;
  }
  return params;
}

// Get ISO week start (Monday) for a given date
function weekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.toISOString().slice(0, 10);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const h = cors(env);
    const method = request.method;
    const path = url.pathname;

    if (method === "OPTIONS") return new Response(null, { status: 204, headers: h });

    try {
      const db = env.COMMUNE_DB;

      // ══════════════════════════════════
      // Spotify Search
      // ══════════════════════════════════
      if (method === "GET" && path === "/spotify/search") {
        const q = url.searchParams.get("q");
        if (!q) return json({ error: "Missing ?q=" }, 400, h);
        if (!env.SPOTIFY_CLIENT_ID) return json({ error: "Spotify not configured" }, 500, h);
        const token = await getSpotifyToken(env);
        const r = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=8&market=US`, { headers: { Authorization: `Bearer ${token}` } });
        return new Response(await r.text(), { status: r.status, headers: { ...h, "Content-Type": "application/json; charset=utf-8" } });
      }

      // ══════════════════════════════════
      // Korean National Library
      // ══════════════════════════════════
      if (method === "GET" && path === "/nl/search") {
        const isbn = url.searchParams.get("isbn");
        if (!isbn) return json({ error: "Missing ?isbn=" }, 400, h);
        if (!env.NL_API_KEY) return json({ error: "NL API not configured" }, 500, h);
        const r = await fetch(`https://www.nl.go.kr/seoji/SearchApi.do?cert_key=${env.NL_API_KEY}&result_style=json&page_no=1&page_size=1&isbn=${encodeURIComponent(isbn)}`);
        return new Response(await r.text(), { status: r.status, headers: { ...h, "Content-Type": "application/json; charset=utf-8" } });
      }

      // ══════════════════════════════════
      // Google Places Text Search
      // ══════════════════════════════════
      // ══════════════════════════════════
      // Google Places Debug Test
      // ══════════════════════════════════
      if (method === "GET" && path === "/places/test") {
        if (!env.GOOGLE_PLACES_KEY) return json({ error: "GOOGLE_PLACES_KEY not set", fix: "Cloudflare Dashboard → Workers → commune-api → Settings → Variables → Add GOOGLE_PLACES_KEY" }, 500, h);
        try {
          const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": env.GOOGLE_PLACES_KEY,
              "X-Goog-FieldMask": "places.displayName,places.formattedAddress",
            },
            body: JSON.stringify({ textQuery: "Starbucks Seoul", pageSize: 1 }),
          });
          const body = await r.text();
          let parsed;
          try { parsed = JSON.parse(body); } catch { parsed = body; }
          return json({
            googleStatus: r.status,
            keyPresent: true,
            keyLength: env.GOOGLE_PLACES_KEY.length,
            keyPrefix: env.GOOGLE_PLACES_KEY.substring(0, 8) + "...",
            response: parsed,
            fix: r.ok ? null : r.status === 403 ? "API key denied. Check: 1) Places API (New) enabled? 2) Billing enabled? 3) API key restrictions?" : r.status === 400 ? "Bad request — check API key format" : "Unknown error",
          }, r.ok ? 200 : r.status, h);
        } catch (e) {
          return json({ error: "Fetch failed: " + e.message, fix: "Network issue from Worker" }, 500, h);
        }
      }

      // ══════════════════════════════════
      // Google Places Text Search
      // ══════════════════════════════════
      if (method === "GET" && path === "/places/search") {
        const q = url.searchParams.get("q");
        if (!q) return json({ error: "Missing ?q=" }, 400, h);
        if (!env.GOOGLE_PLACES_KEY) return json({ error: "Google Places not configured. Set GOOGLE_PLACES_KEY in Worker env." }, 500, h);
        try {
          const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": env.GOOGLE_PLACES_KEY,
              "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.googleMapsUri",
            },
            body: JSON.stringify({ textQuery: q, pageSize: 6 }),
          });
          const body = await r.text();
          if (!r.ok) {
            console.error("Places API error:", r.status, body);
            return json({ error: "Places API error", status: r.status, detail: body }, r.status, h);
          }
          return new Response(body, { status: 200, headers: { ...h, "Content-Type": "application/json; charset=utf-8" } });
        } catch (e) {
          return json({ error: "Places fetch failed: " + e.message }, 500, h);
        }
      }

      // ══════════════════════════════════
      // Google Places Autocomplete
      // ══════════════════════════════════
      if (method === "GET" && path === "/places/autocomplete") {
        const q = url.searchParams.get("q");
        if (!q) return json({ error: "Missing ?q=" }, 400, h);
        if (!env.GOOGLE_PLACES_KEY) return json({ error: "Google Places not configured. Set GOOGLE_PLACES_KEY in Worker env." }, 500, h);
        try {
          const r = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": env.GOOGLE_PLACES_KEY,
            },
            body: JSON.stringify({ input: q }),
          });
          const body = await r.text();
          if (!r.ok) {
            console.error("Places Autocomplete error:", r.status, body);
            return json({ error: "Places Autocomplete error", status: r.status, detail: body }, r.status, h);
          }
          return new Response(body, { status: 200, headers: { ...h, "Content-Type": "application/json; charset=utf-8" } });
        } catch (e) {
          return json({ error: "Autocomplete fetch failed: " + e.message }, 500, h);
        }
      }

      // ══════════════════════════════════
      // GET /posts — list posts (7 days)
      // ══════════════════════════════════
      if (method === "GET" && path === "/posts") {
        const { results: posts } = await db.prepare(
          `SELECT * FROM posts WHERE created_at > datetime('now', '-7 days') ORDER BY created_at DESC`
        ).all();

        let reactions = [];
        if (posts.length > 0) {
          const ids = posts.map(p => p.id);
          const ph = ids.map(() => "?").join(",");
          reactions = (await db.prepare(`SELECT * FROM reactions WHERE post_id IN (${ph})`).bind(...ids).all()).results;
        }

        return json(posts.map(p => ({
          id: p.id,
          author: { name: p.author_name, emoji: p.author_emoji, color: p.author_color },
          text: p.text,
          media: JSON.parse(p.media_data),
          createdAt: p.created_at,
          reactions: reactions.filter(r => r.post_id === p.id).map(r => ({ id: r.id, emoji: r.emoji, userId: r.user_name })),
        })), 200, h);
      }

      // ══════════════════════════════════
      // GET /posts/count?user=... — daily count
      // ══════════════════════════════════
      if (method === "GET" && path === "/posts/count") {
        const user = url.searchParams.get("user");
        if (!user) return json({ error: "Missing ?user=" }, 400, h);
        const { results } = await db.prepare(
          `SELECT COUNT(*) as cnt FROM posts WHERE author_name = ? AND created_at > datetime('now', '-1 day')`
        ).bind(user).all();
        return json({ count: results[0]?.cnt || 0, limit: 5 }, 200, h);
      }

      // ══════════════════════════════════
      // POST /posts — create (max 5/day)
      // ══════════════════════════════════
      if (method === "POST" && path === "/posts") {
        const body = await request.json();
        const { author, text, media, mediaKey } = body;
        if (!author?.name || !text?.trim() || !media) return json({ error: "Missing author, text, or media" }, 400, h);

        // Check daily limit
        const { results: countRes } = await db.prepare(
          `SELECT COUNT(*) as cnt FROM posts WHERE author_name = ? AND created_at > datetime('now', '-1 day')`
        ).bind(author.name).all();
        if ((countRes[0]?.cnt || 0) >= 5) {
          return json({ error: "Daily limit reached (5 posts per day)" }, 429, h);
        }

        const id = genId();
        await db.prepare(
          `INSERT INTO posts (id, author_name, author_emoji, author_color, text, media_type, media_data) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, author.name, author.emoji || "👤", author.color || "#6B7280", text, media.type || "unknown", JSON.stringify(media)).run();

        // Also insert into archive for permanent grouping data
        if (mediaKey) {
          await db.prepare(
            `INSERT INTO archive (user_name, media_type, media_key, media_title) VALUES (?, ?, ?, ?)`
          ).bind(author.name, media.type || "unknown", mediaKey, media.title || media.name || "").run();
        }

        return json({ id, createdAt: new Date().toISOString() }, 201, h);
      }

      // ══════════════════════════════════
      // POST /posts/:id/reactions
      // ══════════════════════════════════
      const rxMatch = matchRoute(path, "/posts/:postId/reactions");
      if (method === "POST" && rxMatch) {
        const { postId } = rxMatch;
        const { emoji, userName } = await request.json();
        if (!emoji || !userName) return json({ error: "Missing emoji or userName" }, 400, h);
        await db.prepare(`DELETE FROM reactions WHERE post_id = ? AND user_name = ?`).bind(postId, userName).run();
        const id = genId();
        await db.prepare(`INSERT INTO reactions (id, post_id, user_name, emoji) VALUES (?, ?, ?, ?)`).bind(id, postId, userName, emoji).run();
        return json({ id, emoji, userId: userName }, 201, h);
      }

      // ══════════════════════════════════
      // DELETE /posts/:id
      // ══════════════════════════════════
      const delMatch = matchRoute(path, "/posts/:postId");
      if (method === "DELETE" && delMatch) {
        const { postId } = delMatch;
        await db.prepare(`DELETE FROM reactions WHERE post_id = ?`).bind(postId).run();
        await db.prepare(`DELETE FROM posts WHERE id = ?`).bind(postId).run();
        return json({ deleted: true }, 200, h);
      }

      // ══════════════════════════════════
      // POST /saves — save someone's post
      // ══════════════════════════════════
      if (method === "POST" && path === "/saves") {
        const { userName, postId, mediaType, mediaData } = await request.json();
        if (!userName || !postId) return json({ error: "Missing userName or postId" }, 400, h);
        // Check if already saved
        const { results: existing } = await db.prepare(
          `SELECT id FROM saves WHERE user_name = ? AND post_id = ?`
        ).bind(userName, postId).all();
        if (existing.length > 0) return json({ id: existing[0].id, already: true }, 200, h);
        const id = genId();
        await db.prepare(
          `INSERT INTO saves (id, user_name, post_id, media_type, media_data) VALUES (?, ?, ?, ?, ?)`
        ).bind(id, userName, postId, mediaType || "unknown", JSON.stringify(mediaData || {})).run();
        return json({ id }, 201, h);
      }

      // ══════════════════════════════════
      // GET /saves?user=...
      // ══════════════════════════════════
      if (method === "GET" && path === "/saves") {
        const user = url.searchParams.get("user");
        if (!user) return json({ error: "Missing ?user=" }, 400, h);
        const { results } = await db.prepare(
          `SELECT * FROM saves WHERE user_name = ? ORDER BY saved_at DESC`
        ).bind(user).all();
        return json(results.map(s => ({ id: s.id, postId: s.post_id, media: JSON.parse(s.media_data), savedAt: s.saved_at })), 200, h);
      }

      // ══════════════════════════════════
      // DELETE /saves/:id
      // ══════════════════════════════════
      const saveDelMatch = matchRoute(path, "/saves/:saveId");
      if (method === "DELETE" && saveDelMatch) {
        await db.prepare(`DELETE FROM saves WHERE id = ?`).bind(saveDelMatch.saveId).run();
        return json({ deleted: true }, 200, h);
      }

      // ══════════════════════════════════
      // GET /club/picks — this week's picks
      // ══════════════════════════════════
      if (method === "GET" && path === "/club/picks") {
        const ws = weekStart();
        const { results } = await db.prepare(
          `SELECT * FROM club_picks WHERE week_start = ? ORDER BY created_at`
        ).bind(ws).all();
        return json(results.map(p => ({ id: p.id, mediaKey: p.media_key, mediaType: p.media_type, media: JSON.parse(p.media_data) })), 200, h);
      }

      // ══════════════════════════════════
      // POST /club/picks — generate weekly (called by cron)
      // ══════════════════════════════════
      if (method === "POST" && path === "/club/picks") {
        const ws = weekStart();
        // Check if already generated
        const { results: existing } = await db.prepare(`SELECT id FROM club_picks WHERE week_start = ?`).bind(ws).all();
        if (existing.length > 0) return json({ message: "Already generated", count: existing.length }, 200, h);

        // Get popular items from archive (most shared across users)
        const { results: popular } = await db.prepare(
          `SELECT media_key, media_type, media_title, COUNT(DISTINCT user_name) as user_count
           FROM archive GROUP BY media_key HAVING user_count >= 1
           ORDER BY user_count DESC, RANDOM() LIMIT 20`
        ).all();

        // Pick 2-3 random from top items
        const shuffled = popular.sort(() => Math.random() - 0.5);
        const picks = shuffled.slice(0, Math.min(3, Math.max(2, shuffled.length)));

        for (const pick of picks) {
          const id = genId();
          await db.prepare(
            `INSERT INTO club_picks (id, media_key, media_type, media_data, week_start) VALUES (?, ?, ?, ?, ?)`
          ).bind(id, pick.media_key, pick.media_type, JSON.stringify({ title: pick.media_title, userCount: pick.user_count }), ws).run();
        }

        return json({ generated: picks.length, weekStart: ws }, 201, h);
      }

      // ══════════════════════════════════
      // GET /archive?user=... — user's history
      // ══════════════════════════════════
      if (method === "GET" && path === "/archive") {
        const user = url.searchParams.get("user");
        if (!user) return json({ error: "Missing ?user=" }, 400, h);
        const { results } = await db.prepare(
          `SELECT * FROM archive WHERE user_name = ? ORDER BY created_at DESC`
        ).bind(user).all();
        return json(results, 200, h);
      }

      // ══════════════════════════════════
      // GET /archive/overlap?u1=...&u2=... — taste overlap
      // ══════════════════════════════════
      if (method === "GET" && path === "/archive/overlap") {
        const u1 = url.searchParams.get("u1"), u2 = url.searchParams.get("u2");
        if (!u1 || !u2) return json({ error: "Missing ?u1=&u2=" }, 400, h);
        const { results } = await db.prepare(
          `SELECT a1.media_key, a1.media_title FROM archive a1
           INNER JOIN archive a2 ON a1.media_key = a2.media_key
           WHERE a1.user_name = ? AND a2.user_name = ?
           GROUP BY a1.media_key`
        ).bind(u1, u2).all();
        return json({ overlap: results.length, items: results }, 200, h);
      }

      // ══════════════════════════════════
      // POST /cleanup — archive & purge old posts
      // ══════════════════════════════════
      if (method === "POST" && path === "/cleanup") {
        // 1. Archive posts older than 7 days (that haven't been archived yet)
        await db.prepare(
          `INSERT OR IGNORE INTO archive (user_name, media_type, media_key, media_title, created_at)
           SELECT author_name, media_type,
             CASE
               WHEN media_type = 'book' THEN 'book-' || json_extract(media_data, '$.isbn13')
               WHEN media_type = 'spotify' THEN 'spotify-' || json_extract(media_data, '$.spotifyId')
               WHEN media_type = 'movie' THEN 'tmdb-' || json_extract(media_data, '$.tmdbId')
               ELSE media_type || '-' || id
             END,
             COALESCE(json_extract(media_data, '$.title'), json_extract(media_data, '$.name'), ''),
             created_at
           FROM posts WHERE created_at <= datetime('now', '-7 days')`
        ).run();

        // 2. Delete old reactions
        await db.prepare(
          `DELETE FROM reactions WHERE post_id IN (SELECT id FROM posts WHERE created_at <= datetime('now', '-7 days'))`
        ).run();

        // 3. Delete old posts
        const result = await db.prepare(
          `DELETE FROM posts WHERE created_at <= datetime('now', '-7 days')`
        ).run();

        return json({ archived_and_cleaned: result.meta?.changes || 0 }, 200, h);
      }

      // ══════════════════════════════════
      // Health
      // ══════════════════════════════════
      if (path === "/" || path === "/health") {
        return json({
          status: "ok", db: !!db,
          spotify: !!env.SPOTIFY_CLIENT_ID, nl: !!env.NL_API_KEY,
          places: !!env.GOOGLE_PLACES_KEY,
          placesKeyLen: env.GOOGLE_PLACES_KEY ? env.GOOGLE_PLACES_KEY.length : 0,
        }, 200, h);
      }

      return json({ error: "Not found" }, 404, h);
    } catch (err) {
      return json({ error: err.message }, 500, h);
    }
  },

  // Hourly: cleanup old posts → archive, generate weekly club picks
  async scheduled(event, env) {
    const db = env.COMMUNE_DB;
    if (!db) return;

    // Archive + delete posts older than 7 days
    await db.prepare(
      `INSERT OR IGNORE INTO archive (user_name, media_type, media_key, media_title, created_at)
       SELECT author_name, media_type,
         CASE
           WHEN media_type = 'book' THEN 'book-' || json_extract(media_data, '$.isbn13')
           WHEN media_type = 'spotify' THEN 'spotify-' || json_extract(media_data, '$.spotifyId')
           WHEN media_type = 'movie' THEN 'tmdb-' || json_extract(media_data, '$.tmdbId')
           ELSE media_type || '-' || id
         END,
         COALESCE(json_extract(media_data, '$.title'), json_extract(media_data, '$.name'), ''),
         created_at
       FROM posts WHERE created_at <= datetime('now', '-7 days')`
    ).run();
    await db.prepare(`DELETE FROM reactions WHERE post_id IN (SELECT id FROM posts WHERE created_at <= datetime('now', '-7 days'))`).run();
    await db.prepare(`DELETE FROM posts WHERE created_at <= datetime('now', '-7 days')`).run();

    // Generate weekly club picks (Monday)
    const ws = weekStart();
    const { results: existing } = await db.prepare(`SELECT id FROM club_picks WHERE week_start = ?`).bind(ws).all();
    if (existing.length === 0) {
      const { results: popular } = await db.prepare(
        `SELECT media_key, media_type, media_title, COUNT(DISTINCT user_name) as user_count
         FROM archive GROUP BY media_key HAVING user_count >= 1 ORDER BY user_count DESC, RANDOM() LIMIT 20`
      ).all();
      const picks = popular.sort(() => Math.random() - 0.5).slice(0, 3);
      for (const pick of picks) {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        await db.prepare(
          `INSERT INTO club_picks (id, media_key, media_type, media_data, week_start) VALUES (?, ?, ?, ?, ?)`
        ).bind(id, pick.media_key, pick.media_type, JSON.stringify({ title: pick.media_title, userCount: pick.user_count }), ws).run();
      }
    }
  },
};
