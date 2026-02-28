# commune — Database Architecture Guide

## Current State
Everything is in React state (in-memory). Data resets on page refresh. To make this real, you need a backend + database.

---

## Recommended Stack (Free Tier Friendly)

### Option A: Supabase (Easiest — recommended for you)
- **What**: Open-source Firebase alternative with PostgreSQL
- **Free tier**: 500MB database, 50K monthly active users, real-time subscriptions
- **Why**: Auth, database, real-time updates all in one. Great docs. Works directly from React (no separate backend needed).

### Option B: Firebase
- **What**: Google's backend-as-a-service
- **Free tier**: 1GB Firestore, 10K auth/month
- **Why**: Fastest to prototype with, excellent real-time support

### Option C: Full Custom (later stage)
- **Stack**: Node.js/Express + PostgreSQL + Redis
- **When**: When you need full control, custom logic, or scale beyond free tiers

---

## Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| username | text | Unique |
| display_name | text | |
| avatar_emoji | text | |
| avatar_color | text | |
| created_at | timestamp | |

### `posts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| author_id | uuid | FK → users.id |
| text | text | Post body |
| media_type | enum | 'book', 'spotify', 'youtube', 'podcast', 'article', 'place' |
| media_data | jsonb | Flexible JSON for all media types (see below) |
| created_at | timestamp | |

#### `media_data` examples:
```json
// Book
{ "title": "Digital Minimalism", "author": "Cal Newport", "isbn": "0525536512", "cover": "https://...", "url": "https://..." }

// Spotify
{ "contentType": "track", "spotifyId": "4cOdK2...", "url": "https://open.spotify.com/..." }

// YouTube
{ "youtubeId": "zjkBMF...", "url": "https://youtube.com/..." }

// Article
{ "title": "The Tyranny of Time", "url": "https://..." }

// Place
{ "name": "Café Integral", "location": "Nolita, NY", "note": "Try the cascara fizz" }
```

### `comments`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| post_id | uuid | FK → posts.id |
| author_id | uuid | FK → users.id |
| text | text | |
| created_at | timestamp | |

### `reactions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| post_id | uuid | FK → posts.id |
| author_id | uuid | FK → users.id |
| emoji | text | e.g. "❤️" |
| created_at | timestamp | |
| expires_at | timestamp | created_at + 5 seconds |

> **Ephemeral reactions**: Use `expires_at` column. A cron job or Supabase Edge Function can clean up expired reactions every few seconds. On the frontend, the countdown animation stays the same.

---

## Supabase Quick Start

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com), sign up, create a project.

### 2. Install the client
```bash
npm install @supabase/supabase-js
```

### 3. Initialize in your app
```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://YOUR_PROJECT.supabase.co',
  'YOUR_ANON_KEY'
)
```

### 4. Example: Fetch posts
```js
const { data: posts } = await supabase
  .from('posts')
  .select(`
    *,
    author:users(*),
    comments(*, author:users(*)),
    reactions(*)
  `)
  .order('created_at', { ascending: false })
```

### 5. Example: Create a post
```js
const { data } = await supabase.from('posts').insert({
  author_id: currentUser.id,
  text: 'Just finished this book...',
  media_type: 'book',
  media_data: { title: 'Digital Minimalism', ... }
})
```

### 6. Real-time reactions
```js
supabase
  .channel('reactions')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' },
    (payload) => {
      // Add new reaction to UI with countdown
    }
  )
  .subscribe()
```

### 7. Auto-delete expired reactions (SQL function + cron)
```sql
-- Run every 5 seconds via pg_cron or Supabase Edge Function
DELETE FROM reactions WHERE expires_at < NOW();
```

---

## Auth
Supabase has built-in auth. You can add:
- Email/password sign up
- Google OAuth
- GitHub OAuth
- Magic link (email-based, no password)

```js
// Sign up
await supabase.auth.signUp({ email, password })

// Sign in with Google
await supabase.auth.signInWithOAuth({ provider: 'google' })
```

---

## Migration Path
1. **Now**: Keep the current in-memory prototype for design/UX iteration
2. **Next**: Add Supabase, replace useState with real DB calls
3. **Later**: Add auth, real-time subscriptions, and reaction cleanup
4. **Scale**: Move to custom backend if needed
