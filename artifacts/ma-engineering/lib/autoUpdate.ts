import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Linking } from "react-native";
import { timeoutSignal } from "@/lib/timeout";
import Constants from "expo-constants";

const GITHUB_RELEASE_URL = "https://api.github.com/repos/blcobra8585-debug/TITAN-NUCLEAR-V1/releases/latest";
const CHECK_INTERVAL_KEY = "last_update_check";
const COOLDOWN_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;

// Fix(D): Compare semver properly — strip 'v' prefix and compare each part
// numerically. Replaces the broken string-search-in-release-body approach.
function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(n => parseInt(n, 10) || 0);
  const [la, lb, lc] = parse(latest);
  const [ca, cb, cc] = parse(current);
  if (la !== ca) return la > ca;
  if (lb !== cb) return lb > cb;
  return lc > cc;
}

export async function autoCheckUpdate(): Promise<void> {
  try {
    const lastCheck = await AsyncStorage.getItem(CHECK_INTERVAL_KEY).catch(() => null);
    if (lastCheck) {
      const elapsed = Date.now() - parseInt(lastCheck, 10);
      if (elapsed < COOLDOWN_MS) return;
    }
    await AsyncStorage.setItem(CHECK_INTERVAL_KEY, Date.now().toString()).catch(() => {});
    const resp = await fetch(GITHUB_RELEASE_URL, {
      signal: timeoutSignal(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!resp.ok) return;
    const release = await resp.json();
    const latestTag: string = release?.tag_name ?? "";
    const downloadUrl: string = release?.assets?.[0]?.browser_download_url ?? "";
    if (!downloadUrl || !latestTag) return;
    // Fix(D): Use real app version from expo-constants, compare tag_name (not
    // free-text release body) so the popup fires exactly once per new release.
    const currentVersion: string = Constants.expoConfig?.version ?? "0.0.0";
    if (!isNewerVersion(latestTag, currentVersion)) return;
    Alert.alert(
      "🚀 Update Available!",
      `Naya version aa gaya!\n\n${release?.name ?? latestTag}\n\nAbhi download karein?`,
      [
        { text: "Baad Mein", style: "cancel" },
        { text: "Download", onPress: () => Linking.openURL(downloadUrl).catch(() => {}) },
      ]
    );
  } catch {}
}

export const checkForUpdate = autoCheckUpdate;
