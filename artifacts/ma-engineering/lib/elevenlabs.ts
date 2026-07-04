import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";

const DEFAULT_VOICE_ID = "cgSgspJ2msm6clMCkdW9";
const BASE_URL = "https://api.elevenlabs.io/v1";

// Track current playing sound so we can stop it
let _currentSound: Audio.Sound | null = null;

/**
 * Convert ArrayBuffer to base64 string without FileReader.
 * FileReader does NOT exist in React Native.
 * Also, `btoa()` is not guaranteed to exist in all RN/Hermes builds, so we encode manually.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i]!;
    const b2 = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2]! : 0;

    const triplet = (b1 << 16) | (b2 << 8) | b3;

    out += base64Chars[(triplet >> 18) & 63];
    out += base64Chars[(triplet >> 12) & 63];
    out += i + 1 < bytes.length ? base64Chars[(triplet >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? base64Chars[triplet & 63] : "=";
  }

  return out;
}

export async function speakWithLily(text: string): Promise<void> {
  try {
    // Stop any currently playing audio before starting a new one
    await stopSpeaking();

    const apiKey = await AsyncStorage.getItem("elevenlabs_api_key").catch(() => null);
    if (!apiKey) return;

    const voiceId =
      (await AsyncStorage.getItem("elevenlabs_voice_id").catch(() => null)) ??
      DEFAULT_VOICE_ID;

    const maxChars = 1000;
    const cleanText = text
      .slice(0, maxChars)
      .replace(/\*+/g, "")
      .replace(/#{1,6}\s/g, "");

    const resp = await fetch(
      `${BASE_URL}/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_flash_v2_5",
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
        }),
      }
    );
    if (!resp.ok) return;

    // FIX: React Native has no FileReader — use arrayBuffer() + btoa() instead
    const arrayBuffer = await resp.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/mp3;base64,${base64}` },
      { shouldPlay: true, volume: 1.0 }
    );
    _currentSound = sound;

    await new Promise<void>((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          _currentSound = null;
          resolve();
        }
      });
    });
  } catch {
    // silent fail — voice is optional
  }
}

export async function stopSpeaking(): Promise<void> {
  try {
    if (_currentSound) {
      await _currentSound.stopAsync();
      await _currentSound.unloadAsync();
      _currentSound = null;
    }
  } catch {
    _currentSound = null;
  }
}

export async function getLilyVoices(): Promise<
  Array<{ voice_id: string; name: string }>
> {
  try {
    const apiKey = await AsyncStorage.getItem("elevenlabs_api_key").catch(
      () => null
    );
    if (!apiKey) return [];
    const resp = await fetch(`${BASE_URL}/voices`, {
      headers: { "xi-api-key": apiKey },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.voices ?? []).slice(0, 20);
  } catch {
    return [];
  }
}
