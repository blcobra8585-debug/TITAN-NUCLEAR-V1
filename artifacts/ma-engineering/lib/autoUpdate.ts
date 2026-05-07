/**
 * AUTO UPDATE SYSTEM
 * Checks GitHub for new APK releases and notifies user
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Linking } from "react-native";

const GITHUB_REPO = "blcobra8585-debug/TITAN-NUCLEAR-V1";
const CURRENT_VERSION = "3.0.0";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

export interface UpdateInfo {
  available: boolean;
  latestVersion?: string;
  downloadUrl?: string;
  releaseNotes?: string;
  buildNumber?: number;
}

export async function checkForUpdate(silent = false): Promise<UpdateInfo> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return { available: false };
    const release = await res.json();

    const latestVersion = release.tag_name?.replace("apk-", "") ?? "";
    const buildNumber = release.assets?.[0]?.name?.match(/v(\d+)/)?.[1];
    const apkAsset = release.assets?.find((a: any) => a.name.endsWith(".apk"));
    const downloadUrl = apkAsset?.browser_download_url ?? release.html_url;

    // Compare by build number (always newer if different tag)
    const lastChecked = await AsyncStorage.getItem("last_update_check");
    const lastBuild = await AsyncStorage.getItem("last_known_build");
    const currentBuild = buildNumber ?? "0";

    await AsyncStorage.setItem("last_update_check", Date.now().toString());

    const isNew = lastBuild !== currentBuild;
    if (isNew) await AsyncStorage.setItem("last_known_build", currentBuild);

    if (isNew && apkAsset && !silent) {
      Alert.alert(
        "🚀 New Update Available!",
        `MA TITAN ka naya version ready hai!\n\nBuild: v${buildNumber}\n\nNew features:\n${release.body?.slice(0, 200) ?? "Bug fixes & improvements"}`,
        [
          { text: "Baad mein", style: "cancel" },
          {
            text: "Download Karo",
            onPress: () => Linking.openURL(downloadUrl),
          },
        ]
      );
    }

    return {
      available: isNew && !!apkAsset,
      latestVersion,
      downloadUrl,
      releaseNotes: release.body,
      buildNumber: parseInt(buildNumber ?? "0"),
    };
  } catch {
    return { available: false };
  }
}

export async function shouldCheck(): Promise<boolean> {
  try {
    const last = await AsyncStorage.getItem("last_update_check");
    if (!last) return true;
    return Date.now() - parseInt(last) > CHECK_INTERVAL_MS;
  } catch {
    return false;
  }
}

export async function autoCheckUpdate() {
  try {
    const should = await shouldCheck();
    if (should) await checkForUpdate(false);
  } catch {}
}
