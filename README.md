# commune 🌊

A social sharing platform for linking books, music, and videos — with ephemeral reactions.

## Features

- **📚 Books** — Link by ISBN, auto-fetches metadata from Open Library
- **🎵 Spotify** — Embed tracks, albums, and playlists
- **🎬 YouTube** — Embed videos inline
- **⏳ Ephemeral Reactions** — Reactions fade after 5 seconds
- **💬 Comments** — Threaded comments on every post

## Quick Start (local)

```bash
npm install
npm run dev
```

Open http://localhost:5173/commune-app/

## Deploy to GitHub Pages

### Step-by-step:

1. **Create a GitHub repo** named `commune-app` (or any name you like)

2. **If you used a different repo name**, edit `vite.config.js` and change the `base` value:
   ```js
   base: '/your-repo-name/',
   ```

3. **Push the code:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/commune-app.git
   git push -u origin main
   ```

4. **Enable GitHub Pages:**
   - Go to your repo → **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**

5. **Done!** The GitHub Action will automatically build and deploy.
   Your site will be live at:
   ```
   https://YOUR_USERNAME.github.io/commune-app/
   ```

## Tech Stack

- React 18 + Vite
- Open Library API (book metadata)
- Spotify Embed API
- YouTube Embed API
