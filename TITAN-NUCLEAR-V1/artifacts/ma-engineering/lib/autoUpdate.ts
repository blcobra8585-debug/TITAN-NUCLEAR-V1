import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Linking } from "react-native";
import Constants from "expo-constants";

const GITHUB_RELEASE_URL = "https://api.github.com/repos/blcobra8585-debug/TITAN-NUCLEAR-V1/releases/latest";
const CHECK_INTERVAL_KEY = "last_update_check";
const COOLDOWN_MS = 6 * 60 * 60 * 1000;

export async function autoCheckUpdate(): Promise<void> {
  try {
    const lastCheck = await AsyncStorage.getItem(CHECK_INTERVAL_KEY).catch(() => null);
    if (lastCheck) {
      const elapsed = Date.now() - parseInt(lastCheck, 10);
      if (elapsed < COOLDOWN_MS) return;
    }
    await AsyncStorage.setItem(CHECK_INTERVAL_KEY, Date.now().toString()).catch(() => {});
    const resp = await fetch(GITHUB_RELEASE_URL, { headers: { Accept: "application/vnd.github+json" } });
    if (!resp.ok) return;
    const release = await resp.json();
    const latestTag: string = release?.tag_name ?? "";
    const downloadUrl: string = release?.assets?.[0]?.browser_download_url ?? "";
    if (!downloadUrl) return;
    // Fix: read version from app.json via Constants instead of hardcoding —
    // a hardcoded string drifts out of sync silently after a version bump.
    const currentVersion: string = Constants.expoConfig?.version ?? "3.2.0";
    if (latestTag && latestTag !== "apk-latest") return;
    const releaseBody: string = release?.body ?? "";
    if (releaseBody.includes(currentVersion)) return;
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
