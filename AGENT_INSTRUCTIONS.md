# AGENT_INSTRUCTIONS.md — v7.0
# MA TITAN — Future Agent Guide
# Last updated by: Replit Agent | Build #v7.0 (2026-05-09)
# App Version: 3.2.0 (versionCode 7)

---

## PROJECT OVERVIEW
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

## CI/CD PIPELINE
- **Repo**: blcobra8585-debug/TITAN-NUCLEAR-V1
- **Trigger**: Any push to main → GitHub Actions → Debug APK built and released
- **Workflow**: .github/workflows/build-apk.yml
- **Build time**: ~30-40 minutes (Gradle + NDK compilation)
- **Output**: GitHub Release with MA-TITAN-vX.X.X-debug.apk
- **Build machine**: ubuntu-latest, Java 17, CMake 3.31, NDK 27
- **After push**: Do NOT push files one-by-one — batch all changes, then 1 push to trigger 1 build

---

## FILE STRUCTURE (base: artifacts/ma-engineering/)


---

## COMPREHENSIVE CODE REVIEW (v7.0)

### Core Files — ALL CLEAN
| File | Status | Notes |
|------|--------|-------|
| _layout.tsx | CLEAN | safeRun wrappers on all startup, ErrorBoundary |
| index.tsx (splash) | CLEAN | useNativeDriver:true, no crashes |
| AppContext.tsx | CLEAN | Parallel AsyncStorage loads, all .catch() guarded |
| gemini.ts | CLEAN | Graceful fallback if no API key |
| whatsapp.ts | CLEAN | Returns boolean, server → wa:// fallback |
| firebase.ts | FIXED v7.0 | Removed unused getAuth+getStorage — reduces crash risk |
| autoLeadBot.ts | FIXED v6.0 | Uses indiamart_glid + indiamart_key |
| recruitmentBot.ts | CLEAN | Silent fail, all try-catch |
| autoUpdate.ts | CLEAN | GitHub Releases check, version compare |
| autoHeal.ts | FIXED v6.0 | APP_VERSION = 3.2.0 |
| firebaseService.ts | CLEAN | Full CRUD, all try-catch, returns empty on error |
| multiAI.ts | CLEAN | 20+ models, MA system prompt, per-model chat history |
| security.ts | CLEAN | PIN check/set/verify via AsyncStorage |
| waWebClient.ts | CLEAN | Server-based WA client, fallback to direct |
| notifications.ts | CLEAN | Dynamic import, Platform.OS guard |
| elevenlabs.ts | FIXED v7.0 | FileReader replaced with arrayBuffer+btoa (CRASH FIX) |

---

## BUGS FIXED (v7.0 — 2026-05-09)

### Fix 1: elevenlabs.ts — FileReader crash (CRITICAL)
- **Problem**: FileReader does not exist in React Native JS environment.
  Calling new FileReader() throws ReferenceError and crashes the app.
- **Fix**: Replaced FileReader blob approach with arrayBuffer() + btoa() + chunk encoding.
  arrayBufferToBase64() helper function converts audio data safely in RN.
- **Commit**: e2965d7d

### Fix 2: firebase.ts — Remove unused auth+storage (MEDIUM)
- **Problem**: getAuth() and getStorage() called at module load time on every app start.
  Firebase Auth web SDK initialization is slow and can crash on Android cold starts.
  Neither auth nor storage were used anywhere in the app.
- **Fix**: Removed getAuth, getStorage imports and exports. Only db (Firestore) kept.
- **Commit**: 8576e8c4

### Fix 3: app.json — expo-av plugin missing (CRITICAL)
- **Problem**: expo-av was used in elevenlabs.ts (Audio.Sound) but not in plugins.
  Missing plugin means Android native Audio module not properly linked → crash.
- **Fix**: Added expo-av to plugins array. Bumped versionCode to 7.
- **Commit**: 8b6a3aa7

### Fix 4: autoLeadBot.ts IndiaMART key mismatch (v6.0)
- Fixed: now reads indiamart_glid + indiamart_key (was indiamart_token)

### Fix 5: google-services.json added (v6.0)
- Firebase Android config — without it Android Firebase init fails

### Fix 6: stopSpeaking not exported (v5.0)
- elevenlabs.ts stopSpeaking export was missing

---

## KNOWN ISSUES (Non-Critical)

### Issue 1: history.tsx sendViaWA phone number
- sendViaWA extracts digits from clientName (not a phone field) to get WA number.
- Proper Fix: Add clientPhone field to quote form + Firestore, use in history.tsx.

---

## CRITICAL CONSTANTS (DO NOT CHANGE)


---

## DEPENDENCIES (CRITICAL)


---

## KEY ASYNCSTORAGE KEYS
| Key | Used By | Set In |
|-----|---------|--------|
| gemini_api_key | gemini.ts, multiAI.ts | Admin Panel |
| elevenlabs_api_key | elevenlabs.ts | Admin Panel |
| elevenlabs_voice_id | elevenlabs.ts | Admin Panel |
| openai_api_key | multiAI.ts | Admin Panel |
| anthropic_api_key | multiAI.ts | Admin Panel |
| groq_api_key | multiAI.ts | Admin Panel |
| deepseek_api_key | multiAI.ts | Admin Panel |
| mistral_api_key | multiAI.ts | Admin Panel |
| cohere_api_key | multiAI.ts | Admin Panel |
| perplexity_api_key | multiAI.ts | Admin Panel |
| server_url | waWebClient.ts | Admin Panel |
| wa_token | waWebClient.ts | Admin Panel |
| indiamart_glid | autoLeadBot.ts | Admin Panel |
| indiamart_key | autoLeadBot.ts | Admin Panel |
| titan_mode | AppContext.tsx | AppContext |
| titan_active_model | chat.tsx | Chat screen |
| titan_pin | security.ts | Admin Panel |
| pin_enabled | security.ts | Admin Panel |
| last_lead_hunt_ts | autoLeadBot.ts | autoLeadBot |
| last_recruit_post | recruitmentBot.ts | recruitmentBot |
| crash_logs | autoHeal.ts | autoHeal |

---

## USER DEVICE INFO
- Device: Realme RMX3853
- Android: 16 (RMX3853_16.0.5.702)
- User: Suhan Siddiqui (MA Engineering, Owner)
- WhatsApp: +917895643069

---

## HOW TO PUSH FILES VIA GITHUB API (bash)


**IMPORTANT RULES:**
- App files live at artifacts/ma-engineering/ in the repo
- AGENT_INSTRUCTIONS.md lives at repo ROOT (not inside artifacts/)
- After pushing: build triggers automatically (~30-40 min)
- Batch all changes — push one file at a time only if absolutely needed
- cancel-in-progress: true — only last push builds

---

## REPLIT ENV VARS AVAILABLE


---

## BUILD HISTORY
| Build | SHA | Status | Notes |
|-------|-----|--------|-------|
| #25520227082 | 343d18a0 | Success | v3.2.0 initial — all 14 core files |
| Post | dad2bd4a | Success | fix(elevenlabs): stopSpeaking export |
| Post | ea933e8c | Success | fix(history): boolean check |
| Post | b14490ae | Cancelled | fix(autoLeadBot): indiamart key |
| Post | 6720439a | Cancelled | fix(autoHeal): version 3.2.0 |
| Post | 4e20af93 | Cancelled | chore: google-services.json |
| Post | 15d1d7fc | Success | chore(app.json): googleServicesFile versionCode 6 |
| v7.0 | e2965d7d | Building | fix(elevenlabs): FileReader→arrayBuffer CRASH FIX |
| v7.0 | 8b6a3aa7 | Building | fix(app.json): expo-av plugin + versionCode 7 |
| v7.0 | 8576e8c4 | Building | fix(firebase): remove unused auth+storage |

---

## NEXT THINGS TO FIX (for next agent)
1. Quote WA phone fix: history.tsx sendViaWA() uses clientName for phone — wrong.
   Add clientPhone field to quote form + Firestore schema, use it in sendViaWA.
2. Test on device after APK: Chat (all AI models), ElevenLabs voice, IndiaMART leads, WhatsApp, quote generation, PIN lock, Firebase sync.
3. WhatsApp bot server: Express server with Firebase for WA auto-reply (user requested).