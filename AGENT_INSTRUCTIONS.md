# TITAN NUCLEAR v1 — AGENT INSTRUCTIONS v4.0
## Last Updated: 2026-05-07 by TITAN Agent

---

## 🎯 PROJECT GOAL
MA TITAN — React Native/Expo Android app for MA Engineering (crane & chimney company)
GitHub: blcobra8585-debug/TITAN-NUCLEAR-V1

---

## 📱 TARGET DEVICE
- Realme RMX3853, Android 16, Realme UI 7.0
- New Architecture (newArchEnabled: true)
- Min SDK 24, Target SDK 35

---

## 🔑 ENVIRONMENT SECRETS (Replit)
- GITHUB_ACCESS_TOKEN — GitHub API
- GITHUB_REPO = blcobra8585-debug/TITAN-NUCLEAR-V1
- FIREBASE_API_KEY — Firebase (used by server only)
- GEMINI_API_KEY — Gemini AI (used by server only; mobile reads from AsyncStorage)
- ELEVENLABS_API_KEY — ElevenLabs (used by server only; mobile reads from AsyncStorage)

---

## 📦 DEPENDENCY VERSIONS (CRITICAL — DO NOT CHANGE)
```json
"react-native-reanimated": "4.3.0",
"react-native-worklets": "0.8.2"   ← REQUIRED by reanimated 4.3.0, DO NOT REMOVE
```
- reanimated 4.3.0 REQUIRES react-native-worklets as a SEPARATE package
- worklets 0.5.1 was OLD and caused crashes — 0.8.2 is the correct version
- NEVER remove react-native-worklets from package.json

---

## 🔧 BASH/CURL GUIDE (Replit environment)
- Use bash tool with curl for GitHub API calls
- Parse JSON with: `node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).sha))"`
- python3 NOT available
- Use `base64 -w 0` for file encoding
- Build with: `pnpm install --no-frozen-lockfile` (GitHub Actions)

---

## 📋 ALL FIXES APPLIED (v4.0)

### Build Fixes:
1. ✅ react-native-worklets@0.8.2 RESTORED (was wrongly removed)
2. ✅ app.json: version 3.2.0, versionCode 6, newArchEnabled: true
3. ✅ expo-av plugin added to app.json

### Runtime Crash Fixes:
4. ✅ _layout.tsx: safeRun() wrapper — no init can crash app
5. ✅ app/index.tsx: useRef for animations, useNativeDriver: true everywhere
6. ✅ context/AppContext.tsx: parallel AsyncStorage load + all .catch() handlers
7. ✅ lib/firebase.ts: getApp() instead of getApps()[0]

### Feature Fixes:
8. ✅ lib/gemini.ts: graceful fallback if no API key set
9. ✅ lib/whatsapp.ts: fallback to direct WhatsApp://link if server not configured
10. ✅ lib/elevenlabs.ts: eleven_flash_v2_5 model + 1000 char limit + silent fail
11. ✅ lib/autoLeadBot.ts: silent fail + dedup + 4h cooldown
12. ✅ lib/recruitmentBot.ts: silent fail + dedup + 24h cooldown
13. ✅ lib/autoUpdate.ts: 6h cooldown + silent fail
14. ✅ .github/workflows/build-apk.yml: improved release notes + CMAKE_PATH

---

## 🚀 APK BUILD TRIGGER
Push any commit to main → GitHub Actions auto-builds APK → GitHub Release
Build takes ~15-20 minutes. Concurrency: cancel-in-progress.

---

## 🐛 KNOWN RUNTIME ISSUES (User's Phone)
- "MA TITAN keeps stopping" — FIXED by safeRun wrappers in _layout.tsx
- "Buttons not working" — was animation nativeDriver issue, FIXED
- "WhatsApp not connecting" — FIXED: now falls back to direct whatsapp:// link
- "Lily not starting" — FIXED: graceful message if no Gemini key set

---

## 📱 FIRST-TIME SETUP (User Instructions)
1. Install new APK (download from GitHub Releases)
2. Open App → Go to Admin Panel tab
3. Set Gemini API key (free: aistudio.google.com)
4. Set ElevenLabs key for Lily voice (optional)
5. For IndiaMART leads: set GLID token in Leads tab
6. WhatsApp works directly without server (opens WhatsApp app)

---

## 🏗️ ARCHITECTURE
- Frontend: React Native 0.81.5 + Expo 54 + New Architecture
- State: React Context (AppContext) + AsyncStorage
- AI: Google Gemini 2.0 Flash (primary), 10+ other models
- Voice: ElevenLabs eleven_flash_v2_5
- Database: Firebase Firestore (direct from mobile)
- Leads: IndiaMART API → Firebase
- Updates: GitHub Releases auto-check
- Security: PIN lock (AsyncStorage)

---

## ⚠️ GOTCHAS
- NEVER remove react-native-worklets (required by reanimated 4.3.0)
- NEVER use useNativeDriver: false with Animated API (crashes New Arch)
- ALWAYS wrap Firebase calls in try-catch
- pnpm-lock.yaml has old versions — `--no-frozen-lockfile` handles update
- Build concurrency cancels previous builds on new push
