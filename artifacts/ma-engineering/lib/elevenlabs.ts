import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";

const VOICE_ID = "Pt5YrLNyu6d2s3s4CVMg";
const BASE_URL = "https://api.elevenlabs.io/v1";

let sound: Audio.Sound | null = null;

export async function speakWithLily(text: string): Promise<void> {
  try {
    const apiKey = await AsyncStorage.getItem("elevenlabs_api_key");
    if (!apiKey) {
      console.warn("ElevenLabs API key not set");
      return;
    }

    // Stop any currently playing audio
    if (sound) {
      await sound.stopAsync().catch(() => {});
      await sound.unloadAsync().catch(() => {});
      sound = null;
    }

    // Clean text for TTS (remove markdown)
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/`/g, "")
      .slice(0, 1000);

    const response = await fetch(
      `${BASE_URL}/text-to-speech/${VOICE_ID}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.4,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn("ElevenLabs error:", response.status);
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );
    const dataUri = `data:audio/mpeg;base64,${base64}`;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: dataUri },
      { shouldPlay: true, volume: 1.0 }
    );
    sound = newSound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound?.unloadAsync().catch(() => {});
        sound = null;
      }
    });
  } catch (e: any) {
    console.warn("ElevenLabs speak error:", e.message);
  }
}

export async function stopSpeaking(): Promise<void> {
  if (sound) {
    await sound.stopAsync().catch(() => {});
    await sound.unloadAsync().catch(() => {});
    sound = null;
  }
}
