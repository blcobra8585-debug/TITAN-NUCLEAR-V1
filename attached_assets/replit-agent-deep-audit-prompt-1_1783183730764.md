Repo: https://github.com/<your-username>/TITAN-NUCLEAR-V1
(Suhan: paste your actual repo URL here before sending this to the agent)

---

# TITAN / MA Engineering — FULL REPO DEEP AUDIT (exhaustive, not sampling)

## Why this prompt exists
Every previous round found real, confirmed bugs by reading actual files — not by guessing or
by pattern-matching on filenames. That approach worked but was still selective: specific files
got picked based on what seemed likely to matter. This round is different. I want an audit that
does not skip anything because it "looks fine" or "looks like boilerplate" — I want every file
actually opened and read, not scanned by filename or assumed safe.

I know this takes real effort and time. Do not shortcut it. Do not sample a few files from each
folder and extrapolate that the rest are similar. A file that looks like every other file in
its folder is exactly the kind of file a bug hides in, because it's the one nobody double-checks.

---

## METHODOLOGY — follow this exact process, don't skip steps

### Step 1: Build a complete inventory first
Before fixing or even flagging anything, produce a full file list of every `.ts`, `.tsx`, `.js`
file in the repo (excluding `node_modules`, build output, and lock files). Group them by
package (`api-server`, `ma-engineering`, `wa-dashboard`, `lib/*`, `scripts`). Show me this list
and the total count before you start reviewing, so both of us know the actual scope.

### Step 2: Read every file, not a sample
Go through the inventory one file at a time. For each file, actually open and read the full
contents — don't infer behavior from the filename, don't assume a file is "just types" or "just
config" without opening it, don't skip a file because a similar-looking file elsewhere was
already checked. Two files can look structurally identical and still have different bugs.

For each file, check specifically for:
- **Unhandled promise rejections**: any `await` not inside a try/catch, where the calling
  function has state to reset (loading flags, UI state) that would get stuck if the await threw.
- **Missing error boundaries on the happy path**: functions assumed to always succeed with no
  fallback if they don't.
- **Race conditions**: shared mutable state (module-level variables, refs, singletons) written
  from more than one async path without any guard against concurrent execution.
- **Memory/listener leaks**: any subscription, interval, event listener, or socket listener
  that's created without a guaranteed corresponding cleanup on unmount/reconnect/error.
- **Stale closures**: React hooks capturing old state/props values because of a missing or
  incorrect dependency array.
- **Off-by-one / boundary errors**: array slicing, pagination, date range math, retry-count
  comparisons — anywhere a `<` should be `<=` or vice versa.
- **Type mismatches papered over with `any` or `as`**: places where a type assertion is hiding
  a genuine runtime risk rather than a harmless narrowing.
- **Hardcoded/fake/placeholder data left in real (non-test) code paths** — anything that looks
  like it was meant to be temporary and never got replaced with real logic.
- **Inconsistent error handling between near-identical functions** — e.g. if four sibling
  functions in the same file all wrap a fetch in try/catch the same way, and a fifth doesn't,
  that's a real find, not noise.
- **Security**: secrets/tokens/keys handled or stored in a way that's readable by anyone with
  basic access (plaintext client storage, logged to console, sent in a URL query string, etc.)
- **Data consistency**: places where local state and remote (Firestore/API) state can silently
  drift apart — e.g. optimistic UI updates with no rollback on failure.

### Step 3: Cross-file consistency check
After going file-by-file, do a second pass specifically comparing similar files/functions
against each other:
- Every screen in `app/(tabs)/` that has a loading state — do they all handle async failures
  the same safe way, or are some inconsistent?
- Every `ask*` function in multiAI.ts — do they all follow the same history-management pattern
  correctly, or did one get missed?
- Every Firestore-touching function across firebaseService.ts, autoLeadBot.ts,
  recruitmentBot.ts, and any dashboard pages — do they all handle the case where Firebase isn't
  ready yet, consistently?
- Every screen that polls a server endpoint on an interval — do they all clean up correctly?

### Step 4: Report before fixing
Give me the full list of everything found, file by file, with a one-line explanation of each
issue and why it matters — before making changes. I want to see the complete picture in one
report, not a stream of fixes with no overview. Once I've seen the list, I'll tell you the
priority order to fix things in.

---

## Ground rules
- If a file is genuinely fine after a real read, that's a valid outcome — I'm not asking you to
  invent problems. I'm asking you not to skip files on the assumption they're fine.
- Don't stop early because you've already found "enough" bugs to feel productive — the goal is
  completeness, not a quick win.
- If the repo is too large to do this in one pass without running out of context, tell me that
  explicitly and propose how you'll split it into multiple passes (e.g. by package) rather than
  silently doing a shallower pass on the whole thing.
- Where you're not sure if something is actually a bug or just unusual-but-intentional code,
  flag it anyway and say so — let me make the call rather than filtering it out yourself.

---

## Note on what's already fixed
The following are already confirmed fixed and don't need to be re-found or re-flagged (only
re-verify these are still correctly in place if you notice something suspicious nearby):
- chat.tsx stuck-loading bug on AI errors
- quote.tsx stuck-loading bug on AI/WhatsApp send errors
- admin.tsx loadAll()/runDiag() missing error handling
- multiAI.ts conversation history corruption on API failure (all providers)
- Firebase Admin crash on init failure (api-server)
- Global uncaughtException/unhandledRejection handlers (api-server)
- PIN hash / hardcoded encryption key (security.ts) — now SHA-256 + SecureStore
- WhatsApp socket reconnect listener leak (waWeb.ts)
- react-native-reanimated / Expo SDK 54 version mismatch (the app-launch crash root cause)
- wa-dashboard WhatsApp tab hardcoded demo data (DEMO_CONTACTS)
- IndiaMART lead-hunting silent data loss during Firebase cold start

Focus entirely on finding what hasn't been found yet.
