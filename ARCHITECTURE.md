# SONA Music — Project Architecture

## Overview

SONA Music is a free, ad-free music streaming web app built with:
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend:** Convex (database + serverless functions + auth)
- **Hosting:** Netlify (static deploy from Vite build)
- **Repo:** https://github.com/nasirdevops/naseer-music

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (React SPA)                    │
│                                                          │
│  main.tsx                                                │
│    ├─ ConvexAuthProvider (Convex Auth)                   │
│    ├─ MusicProvider (music-context.tsx)  ← singleton     │
│    └─ BrowserRouter                                       │
│         ├─ /           → Landing.tsx                     │
│         ├─ /auth        → Auth.tsx (email OTP + guest)   │
│         ├─ /dashboard   → Dashboard.tsx (protected)      │
│         └─ /404         → NotFound.tsx                   │
│                                                          │
│  Dashboard.tsx                                           │
│    ├─ MusicVisualizer.tsx (equalizer, particles, cracker lights) │
│    ├─ TrackRow.tsx (song list item)                      │
│    ├─ NowPlayingBar.tsx (bottom player bar)              │
│    └─ Uses: api.music.searchSmart, searchSaavnAlbums,   │
│            getSaavnAlbumSongs                            │
└───────────────────────┬─────────────────────────────────┘
                        │ Convex actions (HTTP)
┌───────────────────────▼─────────────────────────────────┐
│              CONVEX BACKEND (Node.js runtime)            │
│                                                          │
│  src/convex/music.ts  ("use node" actions)               │
│    ├─ searchSmart()        → JioSaavn + Deezer + YouTube │
│    ├─ searchSaavnAlbums()  → JioSaavn album search       │
│    ├─ getSaavnAlbumSongs() → album tracks + YouTube IDs  │
│    └─ searchYouTube()      → YouTube innertube API       │
│                                                          │
│  src/convex/userMusic.ts (mutations/queries)             │
│    ├─ toggleLike / getLikedSongs                         │
│    ├─ addRecentlyPlayed / getRecentlyPlayed              │
│    └─ createPlaylist / getPlaylists / deletePlaylist     │
│                                                          │
│  src/convex/schema.ts (database tables)                  │
│    ├─ users, playlists, likedSongs, recentlyPlayed       │
│    └─ + authTables (Convex Auth)                         │
└─────────────────────────────────────────────────────────┘
```

---

## Search → Play Request Flow

```
User types "Pushpa Telugu songs" in search bar
         │
         ▼
┌─ Dashboard.handleSearch() ─────────────────────────────┐
│                                                         │
│  Is it a language query? (telugu/hindi/tamil/kannada)   │
│    YES → call searchSaavnAlbums({ query })              │
│    NO  → call searchSmart({ query, limit: 40 })         │
└────────┬──────────────────────────────┬─────────────────┘
         │                              │
         ▼                              ▼
┌─ searchSaavnAlbums() ─────┐  ┌─ searchSmart() ─────────────┐
│ Builds 10-14 queries:     │  │                              │
│  "telugu"                 │  │  STEP 1: JioSaavn            │
│  "Pushpa"                 │  │   autocomplete.get(query)     │
│  "RRR" ... "Hi Nanna"    │  │   → get song IDs              │
│                           │  │                               │
│ Each → JioSaavn           │  │  STEP 2: JioSaavn            │
│  autocomplete.get()       │  │   song.getDetails(songId)     │
│  → albums.data[]          │  │   → encrypted_media_url       │
│                           │  │   → DES-ECB decrypt → URL     │
│ Dedup by album ID         │  │                               │
│ Return SaavnAlbum[]       │  │  STEP 3: Deezer (backup)      │
│                           │  │   /search?q=query             │
│ User clicks album →       │  │   → 30-sec preview URLs       │
│  getSaavnAlbumSongs()     │  │                               │
│   → content.getAlbumDetails│  │  STEP 4: YouTube innertube   │
│   → songs[]               │  │   POST music.youtube.com/     │
│   → YouTube search each   │  │     youtubei/v1/search        │
│   → tracks w/ youtubeId   │  │   → videoId for each track    │
└────────────┬───────────────┘  └──────────────┬──────────────┘
             │                                 │
             ▼                                 ▼
┌─ Track object arrives in Dashboard state ───────────────┐
│  { id, title, artist, album, albumCover, preview,      │
│    duration, source, youtubeId? }                        │
└──────────────────────────┬──────────────────────────────┘
                           │
                User clicks a track
                           │
                           ▼
┌─ MusicContext.playTrack(track) ─────────────────────────┐
│                                                         │
│  Has youtubeId?                                         │
│    YES → loadYouTubeAPI() → ytPlayer.loadVideoById()   │
│          Hidden 1×1px iframe plays full YouTube video   │
│                                                         │
│    NO  → HTMLAudioElement with track.preview            │
│          (Deezer 30-sec or JioSaavn URL)                │
│                                                         │
│  State polling every 500ms:                             │
│    progress, duration, isPlaying, auto-advance          │
│                                                         │
│  Media Session API:                                     │
│    → Android notification controls                      │
│    → iOS lock screen controls                           │
│    → Background playback when screen off                │
└─────────────────────────────────────────────────────────┘
```

---

## Key Files Summary

| File | Role |
|------|------|
| `src/main.tsx` | App bootstrap — routes, providers (Convex Auth, Music, BrowserRouter) |
| `src/pages/Dashboard.tsx` | Main app — search, albums, trending, visualizer, sidebar, player |
| `src/pages/Landing.tsx` | Public marketing page — hero, genres, features, CTA |
| `src/pages/Auth.tsx` | Email OTP + guest login |
| `src/convex/music.ts` | **All music API logic** — JioSaavn, Deezer, YouTube innertube, DES decryption |
| `src/convex/userMusic.ts` | User data CRUD — liked songs, recently played, playlists |
| `src/convex/schema.ts` | Database schema — users, playlists, likedSongs, recentlyPlayed |
| `src/lib/music-context.tsx` | Playback engine — YouTube IFrame API + HTML5 Audio, queue management |
| `src/components/MusicVisualizer.tsx` | Animated background — equalizer, particles, cracker lights |
| `src/components/music/NowPlayingBar.tsx` | Bottom player bar — controls, progress, volume, Media Session |
| `src/components/music/TrackRow.tsx` | Song row component — play, like, album art |

---

## Music Sources

| Source | What it provides | Cost | Limitations |
|--------|-----------------|------|-------------|
| **JioSaavn API** | Indian music metadata (Hindi, Telugu, Tamil, Kannada, Punjabi, Malayalam) | Free | Unofficial/reverse-engineered, may break |
| **Deezer API** | English/Western music metadata + 30-sec previews | Free | 30-second preview clips only |
| **YouTube innertube** | Full-length song playback via YouTube IFrame player — video IDs | Free | Internal API (not official), could change |

---

## Database Schema (Convex)

### Tables

- **users** — Auth users with name, email, image, role
- **playlists** — User-created playlists (name, description, image, trackIds as JSON string)
- **likedSongs** — Tracks the user has liked (indexed by user + track)
- **recentlyPlayed** — Last 50 played tracks per user (indexed by user + timestamp)

### Auth

- Convex Auth with email OTP flow
- Anonymous/guest sign-in supported
- Protected routes via `RequireAuth` wrapper

---

## Deployment

- **Build:** `VITE_CONVEX_URL=... bun run build` → `dist/`
- **Netlify:** `bunx netlify-cli deploy --dir=dist --prod --site naseermusic`
- **GitHub:** Push via GitHub API (Python script in `scripts/push-to-github.py`)

---

## Features

1. **Full-length YouTube playback** via hidden IFrame API
2. **Multi-language search** — Hindi, Telugu, Tamil, Kannada, Punjabi, Malayalam
3. **Album browsing** — language-based album cards from JioSaavn
4. **Music visualizer** — equalizer bars, floating music symbols, cracker lights, cover blast rings
5. **Background playback** — Media Session API for notification/lock screen controls
6. **Mobile responsive** — compact player layout, hidden sidebar, responsive grid
7. **Custom background** — upload any image as dashboard background (localStorage)
8. **Logo toggle** — SONA Music ↔ NAYA Music on click
9. **Queue management** — play next/previous, auto-advance
10. **Auth** — Email OTP + guest login
