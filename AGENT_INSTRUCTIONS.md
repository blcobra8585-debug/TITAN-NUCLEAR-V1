# MA TITAN — Complete Agent Instructions v3.1
> **Read this file FIRST before making ANY changes.**
> This is a living document. Update it whenever you add/change features.

---

## 🎯 WHAT THIS APP IS

**MA TITAN** is a React Native / Expo Android app for **MA Engineering** (industrial crane & chimney company, India).

**Admin:** Suhan Siddiqui | +917895643069  
**GitHub:** `blcobra8585-debug/TITAN-NUCLEAR-V1`  
**APK Build:** GitHub Actions auto-builds APK on every push to `main`  
**Firebase Project:** `ma-engineering-titan`  
**Target Device:** Android (Realme RMX3853, Android 16, Realme UI 7.0)

---

## 🏗️ TECH STACK

| Layer | Tech |
|-------|------|
| Mobile App | React Native 0.81.5 + Expo ~54.0.27 |
| Router | Expo Router (file-based, tabs) |
| Language | TypeScript 5.9 |
| Package Manager | pnpm workspaces |
| Database | Firebase Firestore (direct from mobile — NO server needed) |
| Auth | Firebase Auth |
| Storage | Firebase Storage |
| AI | Gemini + ChatGPT + Claude + Groq + DeepSeek + Mistral + Cohere + Perplexity |
| Voice | ElevenLabs (expo-av for playback) |
| WhatsApp | @whiskeysockets/baileys via API server |
| Backend | Express 5 + Node 24 (only for WhatsApp bot) |
| Build | GitHub Actions → APK artifact |

---

## 📁 PROJECT STRUCTURE

```
TITAN-NUCLEAR-V1/
├── artifacts/
│   ├── ma-engineering/              ← MAIN MOBILE APP
│   │   ├── app/
│   │   │   ├── _layout.tsx          ← Root layout (fonts, providers, bot init)
│   │   │   ├── index.tsx            ← Splash/onboarding
│   │   │   └── (tabs)/
│   │   │       ├── _layout.tsx      ← Tab bar (9 tabs)
│   │   │       ├── index.tsx        ← Dashboard
│   │   │       ├── chat.tsx         ← TITAN AI chat (ALL AI models)
│   │   │       ├── quote.tsx        ← Quote generator (Gemini)
│   │   │       ├── leads.tsx        ← Lead management (Firebase direct)
│   │   │       ├── recruitment.tsx  ← Recruitment bot (NEW)
│   │   │       ├── whatsapp.tsx     ← WhatsApp integration
│   │   │       ├── clients.tsx      ← Client management
│   │   │       ├── history.tsx      ← Revenue history
│   │   │       └── admin.tsx        ← Admin panel (all API keys)
│   │   ├── lib/
│   │   │   ├── multiAI.ts           ← ALL AI engines (Gemini/GPT/Claude/Groq/etc)
│   │   │   ├── gemini.ts            ← Legacy Gemini (still used for quotes)
│   │   │   ├── firebase.ts          ← Firebase client SDK init
│   │   │   ├── firebaseService.ts   ← All Firestore CRUD operations
│   │   │   ├── elevenlabs.ts        ← Voice TTS (expo-av, chunked buffer fix)
│   │   │   ├── autoLeadBot.ts       ← IndiaMART auto-fetch (Firebase direct)
│   │   │   ├── recruitmentBot.ts    ← Auto job posting (Gemini powered)
│   │   │   ├── autoHeal.ts          ← Error recovery + diagnostics
│   │   │   ├── security.ts          ← PIN lock + encryption
│   │   │   ├── autoUpdate.ts        ← GitHub release checker
│   │   │   ├── whatsapp.ts          ← WhatsApp message sender
│   │   │   └── waWebClient.ts       ← WA web client
│   │   ├── components/
│   │   │   ├── ErrorBoundary.tsx    ← Auto crash reporter → Firebase
│   │   │   └── ErrorFallback.tsx    ← Crash UI
│   │   ├── context/
│   │   │   └── AppContext.tsx       ← Global state (keys, settings)
│   │   ├── hooks/
│   │   │   └── useColors.ts         ← Theme colors (dark neon theme)
│   │   └── package.json             ← Dependencies (NO worklets, NO glass-effect)
│   └── api-server/                  ← Express backend (WhatsApp only)
│       └── src/
│           ├── routes/
│           │   ├── leads.ts         ← Leads API + Firebase persistence
│           │   ├── whatsapp.ts      ← WhatsApp/Baileys routes
│           │   └── ...
│           └── lib/
│               ├── firebaseAdmin.ts ← Firebase Admin SDK
│               └── lilyBot.ts       ← Server-side Lily bot
├── .github/
│   └── workflows/
│       └── build-apk.yml            ← GitHub Actions APK builder
└── AGENT_INSTRUCTIONS.md            ← THIS FILE
```

---

## 🔥 FIREBASE COLLECTIONS

| Collection | Purpose |
|------------|---------|
| `leads` | IndiaMART + manual leads (direct from mobile) |
| `quotes` | Generated quotes with amounts |
| `chat_history` | Lily AI conversation history |
| `job_posts` | Recruitment bot generated posts |
| `error_logs` | Auto crash reports from ErrorBoundary |

**Firebase Config:**
```
projectId: ma-engineering-titan
appId: 1:132870376585:android:6ab5faa40b6e5da5390a58
storageBucket: ma-engineering-titan.firebasestorage.app
```

---

## 🤖 AI MODELS SUPPORTED

All configured in `lib/multiAI.ts`. User sets API keys in Admin Panel → stored in AsyncStorage.

| Model | Provider | Key Storage | Notes |
|-------|----------|-------------|-------|
| TITAN | Multi | any key | Tries all, uses best available |
| Gemini 2.5 Pro | Google | `gemini_api_key` | Best quality |
| Gemini 2.0 Flash | Google | `gemini_api_key` | Fastest |
| GPT-4o | OpenAI | `openai_api_key` | Best reasoning |
| Claude 3.5 Sonnet | Anthropic | `anthropic_api_key` | Best code |
| Llama 3.3 70B | Groq | `groq_api_key` | **FREE + ultra-fast** |
| DeepSeek Chat | DeepSeek | `deepseek_api_key` | Cheap GPT-4 level |
| Mistral Large | Mistral | `mistral_api_key` | European AI |
| Cohere Command R+ | Cohere | `cohere_api_key` | RAG specialist |
| Perplexity Sonar | Perplexity | `perplexity_api_key` | Web-connected |

---

## 🐛 CRASHES FIXED (v3.1)

| # | Bug | Fix Applied |
|---|-----|-------------|
| 1 | `react-native-worklets@0.5.1` + `react-native-reanimated@4.x` conflict | Removed `react-native-worklets` from package.json |
| 2 | `expo-glass-effect ~0.1.4` fake package | Removed from package.json |
| 3 | `expo-av` missing for voice playback | Added `expo-av ~15.0.9` to devDependencies |
| 4 | `String.fromCharCode(...new Uint8Array(buffer))` stack overflow on large audio | Fixed with 8192-byte chunked conversion in elevenlabs.ts |
| 5 | Leads lost on server restart | Leads now saved directly to Firebase Firestore from mobile |
| 6 | `KeyboardProvider` missing from layout | Re-added to `_layout.tsx` |
| 7 | Server dependency for basic operations | All data ops now Firebase-direct (no server needed) |

---

## 📦 KEY PACKAGE RULES

**NEVER add these (they cause crashes):**
- `react-native-worklets` — conflicts with reanimated 4
- `expo-glass-effect` — fake package, doesn't exist
- Any package with native modules that isn't in the EAS config

**Always use these versions:**
- `expo-av: ~15.0.9` for audio
- `react-native-reanimated: ~4.1.1` (has worklets built-in)
- `firebase: ^12.12.1` for client SDK

---

## ⚙️ AUTO SYSTEMS (Run on App Start)

1. **`healStorage()`** — Cleans corrupted AsyncStorage keys
2. **`autoCheckUpdate()`** — Checks GitHub for new APK (every 6h)
3. **`startLeadHunting()`** — IndiaMART auto-fetch (every 3h, Firebase direct)
4. **`startRecruitmentBot()`** — Auto job posting (every 12h, if enabled)
5. **`ErrorBoundary`** — Catches all crashes → reports to Firebase `error_logs`

---

## 🚀 HOW TO PUSH CHANGES (GitHub API)

Since git commit/push is blocked in Replit main agent, use the GitHub Contents API:

```javascript
// In code_execution sandbox:
const token = process.env.GITHUB_ACCESS_TOKEN;
const repo = process.env.GITHUB_REPO; // "blcobra8585-debug/TITAN-NUCLEAR-V1"

// 1. Get current file SHA
const fileRes = await fetch(`https://api.github.com/repos/${repo}/contents/PATH`, {
  headers: { Authorization: `token ${token}` }
});
const { sha } = await fileRes.json();

// 2. Update file
await fetch(`https://api.github.com/repos/${repo}/contents/PATH`, {
  method: "PUT",
  headers: { Authorization: `token ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "fix: description",
    content: Buffer.from(FILE_CONTENT).toString("base64"),
    sha
  })
});
```

For multiple files at once, use the Git Tree API (more efficient).

---

## 🔧 HOW TO BUILD APK

1. Push any commit to `main` branch → GitHub Actions auto-triggers
2. Check Actions tab: `https://github.com/blcobra8585-debug/TITAN-NUCLEAR-V1/actions`
3. APK is in the build artifacts (download from Actions page)
4. Build takes ~10-15 minutes

---

## 💡 IMPORTANT RULES FOR AGENTS

1. **NO server dependency for data** — Everything goes directly to Firebase from mobile
2. **Server (api-server) is ONLY for WhatsApp Baileys bot** — Don't route data through it
3. **Always use `lib/multiAI.ts`** for AI calls, not `lib/gemini.ts` directly (deprecated)
4. **Never add native packages** without testing on Android 16 (target device)
5. **Hacker/cyberpunk UI theme** — Dark background, neon blue (#00B4FF), neon cyan, matrix green
6. **Hinglish** in all UI text (Hindi + English mix)
7. **Firebase collections** — Always check existing structure before adding new ones
8. **Push to GitHub** after every set of changes to trigger APK build
9. **Error reporting** — All crashes auto-reported to `error_logs` Firestore collection
10. **Security** — API keys encrypted in AsyncStorage, never in code

---

## 🎨 UI THEME

```
Background: #060610 (near-black)
Card: #0D0D1A
NeonBlue: #00B4FF
NeonCyan: #00FFFF  
Accent: #FF6B35
Border: rgba(0,180,255,0.15)
Matrix Green: #00FF41 (for status/online indicators)
```

Font: `Inter` (400/500/600/700 weights via @expo-google-fonts/inter)

---

## 📱 TABS (9 total)

1. Dashboard — Revenue, stats, quick actions
2. TITAN AI — Multi-AI chat (Gemini/GPT/Claude/Groq/etc)
3. Quote — AI quote generator for crane projects
4. Leads — IndiaMART + manual leads (Firebase real-time)
5. Recruit — Auto job posting bot (NEW in v3.1)
6. WhatsApp — WA bot control
7. Clients — Client management
8. History — Revenue & project history
9. Admin — All API keys, security, diagnostics

---

*Last updated: v3.1 — Multi-AI, Auto Recruitment, Firebase Direct, Security, Auto-Heal*
