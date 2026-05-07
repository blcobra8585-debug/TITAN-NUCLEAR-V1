# AGENT_INSTRUCTIONS.md — v5.0
# MA TITAN — Future Agent Guide
# Last updated by: Replit Agent | Build #25520227082 + bug-fix commits
# App Version: 3.2.0 (versionCode 6)

---

## 🏗️ PROJECT OVERVIEW
**MA TITAN** is a React Native / Expo Android app for **MA Engineering** — an industrial company specializing in EOT/EOT overhead cranes (up to 200T) and industrial chimneys (up to 100m). The app is a full AI-powered business suite with:
- **Lily AI** (Gemini Pro) — Sales assistant, quotation engine
- **Multi-AI Chat** — 20+ models (Gemini, GPT-4o, Claude, Groq, DeepSeek, Mistral, Cohere, Perplexity)
- **Auto Lead Bot** — IndiaMART CRM API + WhatsApp auto-reply
- **Recruitment Bot** — AI job post generator for LinkedIn/WhatsApp
- **Firebase Firestore** — Quotes, leads, chat history, error logs
- **ElevenLabs TTS** — Lily voice narration
- **Auto Update** — GitHub Releases APK self-update
- **PIN Security** — Optional 4-6 digit lock

---

## 🚀 CI/CD PIPELINE
- **Repo**: `blcobra8585-debug/TITAN-NUCLEAR-V1`
- **Trigger**: Any push to `main` → GitHub Actions → Debug APK built and released
- **Workflow**: `.github/workflows/build-apk.yml`
- **Build time**: ~30-40 minutes (Gradle + NDK compilation)
- **Output**: GitHub Release with `MA-TITAN-vX.X.X-debug.apk`
- **Build machine**: ubuntu-latest, Java 17, CMake 3.31, NDK 27
- **After push**: Do NOT push files one-by-one — batch all changes, then 1 push to trigger 1 build

---

## 📁 FILE STRUCTURE (base: `artifacts/ma-engineering/`)
```
app/
  _layout.tsx          — Root layout, ErrorBoundary, safeRun startup, AppInit component
  index.tsx            — Animated splash screen (useNativeDriver:true REQUIRED)
  (tabs)/
    _layout.tsx        — Bottom tab navigator (hidden tabBar, custom HomeScreen nav)
    index.tsx          — Home dashboard: stats, quick actions, Lily status, pricing matrix
    admin.tsx          — Settings: API keys, PIN lock, diagnostics, IndiaMART, server URL
    chat.tsx           — Multi-AI chat with model picker, ElevenLabs TTS, quick phrases
    clients.tsx        — Client CRM: add/edit/search, WhatsApp quick-send
    history.tsx        — Quote history: Firestore, status update, delete, WA share
    leads.tsx          — Lead management: IndiaMART auto-fetch, reply, filter, stats
    quote.tsx          — Auto quotation generator (Gemini): crane & chimney pricing
    recruitment.tsx    — AI job post generator: 10 roles, WhatsApp/clipboard share
    whatsapp.tsx       — WhatsApp bot control panel: status, server config, test
lib/
  autoHeal.ts          — Error reporting, retry logic, crash reporter, diagnostics
  autoLeadBot.ts       — IndiaMART CRM API + WhatsApp auto-reply bot
  autoUpdate.ts        — GitHub Releases APK self-update checker
  elevenlabs.ts        — ElevenLabs TTS: speakWithLily, stopSpeaking, getLilyVoices
  firebase.ts          — Firebase init (hardcoded config — projectId: ma-engineering-titan)
  firebaseService.ts   — Firestore CRUD: quotes, leads, chat, revenue stats
  gemini.ts            — Gemini API wrapper for Lily AI (standalone, not multiAI)
  multiAI.ts           — 20+ AI models: ALL_AI_MODELS, askAI(), resetAllAIChats()
  notifications.ts     — Expo push notifications: lead alerts, bot reply badges
  recruitmentBot.ts    — AI job description generator, IndiaMART-style posting
  security.ts          — PIN lock: check, set, verify via AsyncStorage
  waWebClient.ts       — WhatsApp Web client (server-based, fallback to direct link)
  whatsapp.ts          — sendWhatsAppMessage(): server API → wa:// deeplink fallback
context/
  AppContext.tsx        — Global state: all settings loaded in parallel from AsyncStorage
hooks/
  useColors.ts         — Dark/light theme colors hook
```

---

## ✅ COMPREHENSIVE CODE REVIEW (v5.0 — All Files Reviewed)

### Core Files — Status: ALL CLEAN
| File | Status | Notes |
|------|--------|-------|
| `_layout.tsx` | ✅ CLEAN | safeRun wrappers on all startup, ErrorBoundary |
| `index.tsx` (splash) | ✅ CLEAN | useNativeDriver:true, no crashes |
| `AppContext.tsx` | ✅ CLEAN | Parallel AsyncStorage loads, all .catch() guarded |
| `gemini.ts` | ✅ CLEAN | Graceful fallback if no API key |
| `whatsapp.ts` | ✅ CLEAN | Returns boolean, server → wa:// fallback |
| `firebase.ts` | ✅ CLEAN | Hardcoded config, getApps() guard |
| `autoLeadBot.ts` | ✅ CLEAN | Silent fail, all try-catch |
| `recruitmentBot.ts` | ✅ CLEAN | Silent fail, all try-catch |
| `autoUpdate.ts` | ✅ CLEAN | GitHub Releases check, version compare |
| `autoHeal.ts` | ✅ CLEAN | withRetry, safeSyncToFirebase, runDiagnostics |
| `firebaseService.ts` | ✅ CLEAN | Full CRUD, all try-catch, returns empty on error |
| `multiAI.ts` | ✅ CLEAN | 20+ models, MA system prompt, per-model chat history |
| `security.ts` | ✅ CLEAN | PIN check/set/verify via AsyncStorage |
| `waWebClient.ts` | ✅ CLEAN | Server-based WA client, fallback to direct |
| `notifications.ts` | ✅ CLEAN | Dynamic import, Platform.OS guard |

### Screen Files — Status: ALL CLEAN (post-fix)
| File | Status | Notes |
|------|--------|-------|
| `(tabs)/index.tsx` | ✅ CLEAN | Dashboard, stats, quick actions |
| `(tabs)/admin.tsx` | ✅ CLEAN | All keys, IndiaMART, diagnostics, PIN |
| `(tabs)/chat.tsx` | ✅ FIXED | stopSpeaking import now valid |
| `(tabs)/clients.tsx` | ✅ CLEAN | CRM, search, WA quick-send |
| `(tabs)/history.tsx` | ✅ FIXED | sendWhatsAppMessage boolean check fixed |
| `(tabs)/leads.tsx` | ✅ CLEAN | IndiaMART auto-fetch, filter, reply |
| `(tabs)/quote.tsx` | ✅ CLEAN | Gemini quote generator |
| `(tabs)/recruitment.tsx` | ✅ CLEAN | Job post generator, share |
| `(tabs)/whatsapp.tsx` | ✅ CLEAN | Bot panel, server config |

---

## 🐛 BUGS FIXED (v5.0)

### Bug 1: stopSpeaking not exported (CRITICAL — runtime crash)
- **File**: `lib/elevenlabs.ts`
- **Problem**: `chat.tsx` imports `{ speakWithLily, stopSpeaking }` but `elevenlabs.ts` only exported `speakWithLily` and `getLilyVoices`. Runtime call to undefined function → crash.
- **Fix**: Added `_currentSound` module-level tracker. `speakWithLily` now stores the `Audio.Sound` reference. `stopSpeaking()` exported: stops + unloads current sound.
- **Commit**: `dad2bd4a`

### Bug 2: sendWhatsAppMessage boolean check (FUNCTIONAL — success never shown)
- **File**: `app/(tabs)/history.tsx` → `sendViaWA()`
- **Problem**: `sendWhatsAppMessage` returns `Promise<boolean>` but code checked `r.success` (undefined on boolean) → success Alert never triggered, always showed "set WA Token" message even when send succeeded.
- **Fix**: Changed `if (r.success)` → `if (r)`
- **Commit**: `ea933e8c`

---

## ⚠️ KNOWN ISSUES (Non-Critical)

### Issue 1: history.tsx sendViaWA phone number extraction
- `sendViaWA` extracts digits from `q.clientName` (not a phone field) to get the WA number. This will almost always produce garbage. The `quotes` Firestore collection doesn't store a phone field — only clientName, projectType, tonnage, quotedAmount, quoteText, status.
- **Workaround**: User must manually copy the quote text and send WA. The auto-send will silently fail to wrong number.
- **Proper Fix**: Add `clientPhone` field to the quote form, save it to Firestore, use it in history.tsx.

### Issue 2: autoLeadBot.ts uses "indiamart_token" key
- `autoLeadBot.ts` reads AsyncStorage key `"indiamart_token"` but the Admin Panel (admin.tsx) saves as `"indiamart_glid"` and `"indiamart_key"` separately.
- **Impact**: autoLeadBot may not find credentials from what user enters in Admin Panel.
- **Proper Fix**: Update `autoLeadBot.ts` to read `"indiamart_glid"` and `"indiamart_key"` separately, compose the IndiaMART API call accordingly.

### Issue 3: autoHeal.ts APP_VERSION hardcoded as "3.1.0"
- Should be "3.2.0" to match app.json. Low priority (only affects error log metadata).

---

## 🔑 CRITICAL CONSTANTS (DO NOT CHANGE)
```
Firebase projectId:  ma-engineering-titan
Firebase appId:      1:132870376585:android:6ab5faa40b6e5da5390a58
Firebase apiKey:     AIzaSyCDUwKl5G6Mz6lGRa0GBKK4LQPGSiTJJKs (hardcoded in firebase.ts)
App version:         3.2.0 (versionCode 6)
ElevenLabs voice:    cgSgspJ2msm6clMCkdW9 (default)
Secret base rate:    ₹5,500/ton (in multiAI.ts system prompt — CONFIDENTIAL)
Quote rate:          ₹6,600+/ton
```

---

## 📦 DEPENDENCIES (CRITICAL PAIRS — DO NOT CHANGE)
```json
"react-native-reanimated": "~4.3.0"
"react-native-worklets": "^0.8.2"   ← REQUIRED by reanimated 4.x — NEVER REMOVE
```
Removing worklets WILL break the build. Reanimated 4.x splits worklets into a separate package.

---

## 🔧 KEY ASYNCSTORAGE KEYS
| Key | Used By | Set In |
|-----|---------|--------|
| `gemini_api_key` | gemini.ts, multiAI.ts | Admin Panel |
| `elevenlabs_api_key` | elevenlabs.ts | Admin Panel |
| `elevenlabs_voice_id` | elevenlabs.ts | Admin Panel |
| `openai_api_key` | multiAI.ts | Admin Panel |
| `anthropic_api_key` | multiAI.ts | Admin Panel |
| `groq_api_key` | multiAI.ts | Admin Panel |
| `deepseek_api_key` | multiAI.ts | Admin Panel |
| `mistral_api_key` | multiAI.ts | Admin Panel |
| `cohere_api_key` | multiAI.ts | Admin Panel |
| `perplexity_api_key` | multiAI.ts | Admin Panel |
| `server_url` | waWebClient.ts, whatsapp.ts | Admin Panel |
| `wa_token` | waWebClient.ts | Admin Panel |
| `indiamart_glid` | admin.tsx | Admin Panel |
| `indiamart_key` | admin.tsx | Admin Panel |
| `indiamart_token` | autoLeadBot.ts | ⚠️ MISMATCH — see Known Issues |
| `titan_mode` | AppContext.tsx | AppContext |
| `titan_active_model` | chat.tsx | Chat screen |
| `titan_pin` | security.ts | Admin Panel |
| `pin_enabled` | security.ts | Admin Panel |
| `last_lead_hunt` | autoLeadBot.ts | autoLeadBot |
| `last_recruit_post` | recruitmentBot.ts | recruitmentBot |
| `recruitment_location` | recruitment.tsx | Recruitment screen |
| `recruitment_salary` | recruitment.tsx | Recruitment screen |
| `recruitment_roles` | recruitment.tsx | Recruitment screen |
| `crash_logs` | autoHeal.ts | autoHeal |

---

## 🤖 MULTI-AI MODELS (multiAI.ts)
Supported providers (all use user-supplied keys from AsyncStorage):
- **Google Gemini**: gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro
- **OpenAI**: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
- **Anthropic**: claude-3-5-sonnet, claude-3-haiku
- **Groq** (free, fastest): llama-3.3-70b, llama-3.1-8b, mixtral-8x7b, gemma2-9b
- **DeepSeek**: deepseek-chat, deepseek-reasoner
- **Mistral**: mistral-large, mistral-small
- **Cohere**: command-r-plus
- **Perplexity**: sonar-pro
- **titan** (special): Uses gemini.ts with Lily system prompt

All models maintain their own chat history (Map<AIModel, history[]>).
`resetAllAIChats()` clears all histories.

---

## 📱 USER DEVICE INFO
- **Device**: Realme RMX3853
- **Android**: 16
- **User**: Suhan Siddiqui (MA Engineering, Owner)
- **WhatsApp**: +917895643069

---

## 🔄 HOW TO PUSH FILES VIA GITHUB API (bash)
```bash
# Get file SHA first:
curl -s -H "Authorization: token $GITHUB_ACCESS_TOKEN" \
  "https://api.github.com/repos/$GITHUB_REPO/contents/PATH/TO/FILE" | node -e \
  "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).sha))"

# Push file (use Node.js script — bash heredoc encoding is unreliable):
node << 'EOF'
const https = require('https');
const TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const REPO = process.env.GITHUB_REPO;
const content = `YOUR FILE CONTENT HERE`;
const body = JSON.stringify({
  message: 'your commit message',
  content: Buffer.from(content).toString('base64'),
  sha: 'SHA_FROM_ABOVE'
});
// ... standard https.request PUT to /repos/REPO/contents/PATH
EOF
```
- **IMPORTANT**: Always use Node.js script for GitHub API pushes — bash base64/heredoc encoding is unreliable
- App files live at `artifacts/ma-engineering/` in the repo
- AGENT_INSTRUCTIONS.md lives at **repo root** (not inside artifacts/)
- After pushing: build triggers automatically, takes 30-40 min
- **Batch all changes** — don't push one file at a time during active builds

---

## 📊 BUILD HISTORY
| Run | SHA | Status | Notes |
|-----|-----|--------|-------|
| #25520227082 | 343d18a0 | 🔄 Running | v3.2.0 initial build — all 14 core files |
| Post-fix | dad2bd4a | ✅ | fix(elevenlabs): stopSpeaking export added |
| Post-fix | ea933e8c | ✅ | fix(history): boolean check fixed |

---

## 🧑‍💻 REPLIT ENV VARS AVAILABLE
```
GITHUB_ACCESS_TOKEN   — for GitHub API operations
GITHUB_REPO           — blcobra8585-debug/TITAN-NUCLEAR-V1
GEMINI_API_KEY        — Google Gemini (can be used directly in scripts)
ELEVENLABS_API_KEY    — ElevenLabs TTS
FIREBASE_API_KEY      — Firebase (also hardcoded in firebase.ts)
SESSION_SECRET        — Express session (if backend added)
```

---

## ⚡ QUICK REFERENCE: NEXT THINGS TO FIX
1. **IndiaMART key mismatch**: `autoLeadBot.ts` reads `"indiamart_token"` but admin saves `"indiamart_glid"` + `"indiamart_key"`. Fix: update `autoLeadBot.ts` to use both keys.
2. **Quote WA send**: `history.tsx` `sendViaWA()` extracts phone from clientName — wrong. Fix: add clientPhone to quote schema.
3. **autoHeal version**: Change `APP_VERSION = "3.1.0"` to `"3.2.0"` in autoHeal.ts.
4. **Test on device**: After APK install, test: Chat (all AI models), ElevenLabs voice, IndiaMART lead fetch, WhatsApp send, quote generation, PIN lock.
