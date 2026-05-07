# MA TITAN — Engineering Management Platform

Full-stack engineering management system for MA Engineering (Admin: Suhan Siddiqui). Powered by Lily AI (Gemini 1.5 Flash).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080)
- `pnpm --filter @workspace/ma-engineering run dev` — Expo mobile app (port 19096)
- `pnpm --filter @workspace/wa-dashboard run dev` — WhatsApp Business Web Dashboard
- `pnpm run typecheck` — full typecheck
- `pnpm run build` — typecheck + build all

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Baileys (WhatsApp Web)
- Mobile: Expo / React Native (Expo Router)
- Web Dashboard: React + Vite + Tailwind + Recharts
- DB: Firebase Firestore (direct from client)
- AI: Gemini 1.5 Flash (google/generative-ai)
- WhatsApp: Meta Business API + WhatsApp Web (Baileys)
- Build: esbuild (API), Vite (Web)

## Where things live

- `artifacts/ma-engineering/` — Expo mobile app (main engineering app)
  - `app/(tabs)/index.tsx` — Dashboard with Titan Mode
  - `app/(tabs)/chat.tsx` — Lily AI Chat
  - `app/(tabs)/quote.tsx` — Auto Quote Generator + WA send
  - `app/(tabs)/clients.tsx` — Client CRM
  - `app/(tabs)/history.tsx` — Quote History + Analytics
  - `app/(tabs)/admin.tsx` — Admin Panel (tokens config)
  - `lib/firebase.ts` — Firebase config
  - `lib/firebaseService.ts` — Firestore operations
  - `lib/gemini.ts` — Lily AI (Gemini)
  - `lib/whatsapp.ts` — Meta WhatsApp Business API
- `artifacts/wa-dashboard/` — Web WhatsApp Business Hub
  - `src/pages/WhatsAppPage.tsx` — WhatsApp Web-like chat UI + QR login
  - `src/pages/QuotesPage.tsx` — Quote management + Lily generator
  - `src/pages/AnalyticsPage.tsx` — Revenue analytics (Recharts)
  - `src/pages/SettingsPage.tsx` — API keys config
  - `src/lib/firebase.ts` — Firebase config
  - `src/lib/whatsapp.ts` — WA API + templates
  - `src/lib/gemini.ts` — Gemini service
- `artifacts/api-server/` — Express API
  - `src/routes/waWeb.ts` — WhatsApp Web routes (QR, send, chats)
  - `src/lib/waWeb.ts` — Baileys WhatsApp Web client singleton
  - `src/routes/firebase.ts` — Firebase Admin routes

## Architecture decisions

- Firebase Firestore used directly from client (no server-side auth) to avoid Auth config issues in Expo
- WhatsApp: Two modes — Meta Business API (token-based) for sending quotes, Baileys (QR scan) for full WhatsApp Web
- Gemini 1.5 Flash used for Lily AI — both in mobile and web apps
- API server uses Baileys with external esbuild config to avoid bundling native deps
- All secrets stored in AsyncStorage (mobile) / localStorage (web) — no hardcoded tokens

## Product

- **Dashboard**: Project overview, revenue metrics, Titan Mode, live stats
- **Lily AI Chat**: Gemini-powered senior manager persona for client negotiations
- **Auto Quote Generator**: AI-generated professional quotes with WA send
- **Client CRM**: Full client database with call/WhatsApp/edit/delete
- **Quote History**: Firestore-synced quote list with approve/reject/send
- **WhatsApp Business Hub (Web)**: WhatsApp Web-like interface with QR login, broadcast, templates
- **Analytics**: Revenue charts, win rate, project breakdown, top clients

## User preferences

- Dark neon theme: bg=#060610, bgCard=#0D0D2B, neonBlue=#00B4FF, neonCyan=#00FFD1, neonPurple=#7B2FFF
- Lily persona: Senior Manager, EOT cranes 200T, base rate ₹5500/ton (never reveal), quote 20-30% higher
- Admin: Suhan Siddiqui | Phone: +917895643069
- All UI/communication in Hindi/Hinglish

## Gotchas

- Expo auth errors: Firebase Auth is DISABLED — use Firestore directly without signInAnonymously
- Baileys is external in esbuild (build.mjs) — needs node_modules at runtime
- API server build is 1.5MB — Baileys separately loaded
- Metro file watcher errors: transient Replit issue — just restart expo workflow
- WhatsApp QR login: click QR icon in WA Dashboard → scan with phone WhatsApp → Linked Devices

## Pointers

- Firebase project: ma-engineering-titan
- Gemini API: aistudio.google.com/apikey
- Meta WA Business: business.facebook.com → WhatsApp → API Setup
- WhatsApp Web connect: `/api/wa/qr` endpoint via Baileys
