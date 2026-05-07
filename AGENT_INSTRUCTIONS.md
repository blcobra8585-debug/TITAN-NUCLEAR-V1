# MA TITAN — Agent Instructions v3.2
> Read this file FIRST before making ANY changes.

## WHAT THIS APP IS
MA TITAN — React Native/Expo Android app for MA Engineering (crane & chimney company, India).
Admin: Suhan Siddiqui | +917895643069
GitHub: blcobra8585-debug/TITAN-NUCLEAR-V1
APK Build: GitHub Actions auto-builds on every push to main
Firebase Project: ma-engineering-titan
Target Device: Realme RMX3853, Android 16, Realme UI 7.0

## TECH STACK
- Mobile App: React Native 0.81.5 + Expo ~54.0.27
- Router: Expo Router (file-based, 9 tabs)
- DB: Firebase Firestore (direct from mobile, NO server needed)
- AI: Gemini + GPT + Claude + Groq + DeepSeek + Mistral + Cohere + Perplexity
- Voice: ElevenLabs (expo-av ~16.0.8)
- Backend: Express 5 (ONLY for WhatsApp/Baileys bot)
- Build: GitHub Actions → APK → GitHub Release

## KEY FILES
- artifacts/ma-engineering/app/(tabs)/ — 9 tab screens
- artifacts/ma-engineering/lib/multiAI.ts — ALL AI engines
- artifacts/ma-engineering/lib/firebase.ts — Firebase init
- artifacts/ma-engineering/lib/firebaseService.ts — Firestore CRUD
- artifacts/ma-engineering/lib/autoLeadBot.ts — IndiaMART auto-fetch
- artifacts/ma-engineering/lib/recruitmentBot.ts — Job posting bot
- artifacts/ma-engineering/lib/elevenlabs.ts — Voice TTS
- artifacts/ma-engineering/lib/autoHeal.ts — Error recovery
- artifacts/ma-engineering/lib/security.ts — PIN + encryption
- artifacts/ma-engineering/lib/autoUpdate.ts — GitHub release checker
- .github/workflows/build-apk.yml — APK builder (NDK 27, CMake 3.31, Java 17)

## FIREBASE COLLECTIONS
- leads: IndiaMART + manual leads
- quotes: Generated quotes
- chat_history: AI conversation
- job_posts: Recruitment posts
- error_logs: Crash reports

## CRASHES FIXED (v3.2)
1. react-native-worklets conflict with reanimated 4.x → REMOVED worklets from package.json
2. expo-glass-effect fake package → removed
3. expo-av missing → added ~16.0.8
4. Buffer stack overflow in audio → 8192-byte chunks in elevenlabs.ts
5. Leads lost on restart → Firebase direct from mobile
6. KeyboardProvider missing → re-added to _layout.tsx
7. Server dependency → all ops Firebase-direct
8. react-native-worklets 0.8.2 still present → REMOVED in v3.2 (MAIN CRASH FIX)
9. app.json version mismatch → fixed version=3.1.0, versionCode=5

## CRITICAL RULES
1. NEVER add react-native-worklets (reanimated 4.x has it built-in)
2. NEVER add expo-glass-effect (fake package)
3. newArchEnabled: true must stay in app.json (required for reanimated 4.x)
4. Server is ONLY for WhatsApp bot — all data goes Firebase-direct
5. Always use lib/multiAI.ts for AI, not lib/gemini.ts (deprecated)
6. UI: dark bg #060610, neon blue #00B4FF, neon cyan #00FFD1, hacker theme
7. Text: Hinglish (Hindi+English mix)
8. Push to GitHub after every change (triggers APK build automatically)

## HOW TO PUSH VIA BASH (python3 not available, use node for JSON)
SHA=$(curl -s -H "Authorization: token $GITHUB_ACCESS_TOKEN" \
  "https://api.github.com/repos/$GITHUB_REPO/contents/PATH" | \
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).sha))")

ENCODED=$(cat file.txt | base64 -w 0)
curl -s -X PUT "https://api.github.com/repos/$GITHUB_REPO/contents/PATH" \
  -H "Authorization: token $GITHUB_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"fix: msg\",\"content\":\"$ENCODED\",\"sha\":\"$SHA\"}"

## APK DOWNLOAD
Latest release: https://github.com/blcobra8585-debug/TITAN-NUCLEAR-V1/releases/latest
Actions page: https://github.com/blcobra8585-debug/TITAN-NUCLEAR-V1/actions
Build time: ~10-15 minutes after push

## TARGET DEVICE
Model: Realme RMX3853 | Android 16 | Realme UI 7.0
Kernel: 6.1.141-android14 | Security: 1 April 2026

## TABS (9 total)
1. Dashboard | 2. TITAN AI | 3. Quote | 4. Leads | 5. Recruit
6. WhatsApp | 7. Clients | 8. History | 9. Admin

Last updated: v3.2 — worklets crash fix + version sync
