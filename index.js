/**
 * commune-api — Cloudflare Worker
 *
 * Proxies API calls to keep secrets server-side.
 * Endpoints:
 *   GET /spotify/search?q=...   → Spotify Search (Client Credentials)
 *   GET /nl/search?isbn=...     → Korean National Library ISBN lookup
 *
 * Environment variables (set in Cloudflare dashboard → Settings → Variables):
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   NL_API_KEY
 *   ALLOWED_ORIGIN  (e.g. https://yourname.github.io)
 */

// Spotify token cache (in-memory, per isolate)
let spotifyToken = null;
let spotifyTokenExpiry = 0;

async function getSpotifyToken(env) {
  if (spotifyToken && Date.now() < spotifyTokenExpiry) return spotifyToken;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(env.SPOTIFY_CLIENT_ID + ":" + env.SPOTIFY_CLIENT_SECRET),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error("Failed to get Spotify token");
  const data = await res.json();
  spotifyToken = data.access_token;
  spotifyTokenExpiry = Date.now() + (data.expires_in - 120) * 1000;
  return spotifyToken;
}

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = corsHeaders(env);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    try {
      // ── Spotify Search ──
      if (url.pathname === "/spotify/search") {
        const q = url.searchParams.get("q");
        if (!q) return new Response("Missing ?q= parameter", { status: 400, headers });
        if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
          return new Response("Spotify credentials not configured", { status: 500, headers });
        }

        const token = await getSpotifyToken(env);
        const spotifyRes = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=8&market=US`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await spotifyRes.text();
        return new Response(data, {
          status: spotifyRes.status,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      // ── Korean National Library ISBN Search ──
      if (url.pathname === "/nl/search") {
        const isbn = url.searchParams.get("isbn");
        if (!isbn) return new Response("Missing ?isbn= parameter", { status: 400, headers });
        if (!env.NL_API_KEY) {
          return new Response("NL API key not configured", { status: 500, headers });
        }

        const nlRes = await fetch(
          `https://www.nl.go.kr/seoji/SearchApi.do?cert_key=${env.NL_API_KEY}&result_style=json&page_no=1&page_size=1&isbn=${encodeURIComponent(isbn)}`
        );

        const data = await nlRes.text();
        return new Response(data, {
          status: nlRes.status,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      // ── Health check ──
      if (url.pathname === "/" || url.pathname === "/health") {
        return new Response(JSON.stringify({
          status: "ok",
          endpoints: ["/spotify/search?q=...", "/nl/search?isbn=..."],
          spotify: !!env.SPOTIFY_CLIENT_ID,
          nl: !!env.NL_API_KEY,
        }), {
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      return new Response("Not found", { status: 404, headers });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
  },
};
