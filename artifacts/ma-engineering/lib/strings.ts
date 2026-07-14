/**
 * TITAN — Centralized UI Strings (Phase 1: Dashboard + Admin)
 * Language is controlled by ThemeContext.language ("hi" | "en")
 * "hi" = Hinglish (default), "en" = English
 */
import { Language } from "@/context/ThemeContext";

export interface Strings {
  // Dashboard
  dash_subtitle: string;
  dash_titan_mode: string;
  dash_titan_on: string;
  dash_titan_off: string;
  dash_revenue: string;
  dash_this_quarter: string;
  dash_lily_bot: string;
  dash_replies_sent: string;
  dash_wa_disconnected: string;
  dash_active_projects: string;
  dash_pending_quotes: string;
  dash_active_chats: string;
  dash_core_diagnostics: string;
  dash_core_temp: string;
  dash_refresh: string;
  dash_bot_auto: string;
  dash_bot_manual: string;
  // Pin lock screen
  pin_title: string;
  pin_subtitle: string;
  pin_error_wrong: string;
  pin_locked: string;
  pin_placeholder: string;
  pin_enter: string;
}

const HI: Strings = {
  // Dashboard
  dash_subtitle: "MA Engineering • Control Panel",
  dash_titan_mode: "TITAN MODE",
  dash_titan_on: "System Full Power pe hai ⚡",
  dash_titan_off: "Tap karo activate karne ke liye",
  dash_revenue: "REVENUE",
  dash_this_quarter: "Yeh Quarter",
  dash_lily_bot: "LILY BOT",
  dash_replies_sent: "Replies gaye",
  dash_wa_disconnected: "WA Nahi Judi",
  dash_active_projects: "Active\nProjects",
  dash_pending_quotes: "Pending\nQuotes",
  dash_active_chats: "Active\nChats",
  dash_core_diagnostics: "NUCLEAR CORE DIAGNOSTICS",
  dash_core_temp: "CORE TEMP",
  dash_refresh: "Refresh Karo",
  dash_bot_auto: "● Auto ON",
  dash_bot_manual: "● Manual",
  // Pin lock
  pin_title: "MA TITAN",
  pin_subtitle: "PIN daalo app kholne ke liye",
  pin_error_wrong: "Galat PIN! Dobara try karo.",
  pin_locked: "App lock ho gayi. Baad mein try karo.",
  pin_placeholder: "PIN",
  pin_enter: "Kholo",
};

const EN: Strings = {
  // Dashboard
  dash_subtitle: "MA Engineering • Control Panel",
  dash_titan_mode: "TITAN MODE",
  dash_titan_on: "System running at full power ⚡",
  dash_titan_off: "Tap to activate",
  dash_revenue: "REVENUE",
  dash_this_quarter: "This Quarter",
  dash_lily_bot: "LILY BOT",
  dash_replies_sent: "Replies sent",
  dash_wa_disconnected: "WA Disconnected",
  dash_active_projects: "Active\nProjects",
  dash_pending_quotes: "Pending\nQuotes",
  dash_active_chats: "Active\nChats",
  dash_core_diagnostics: "NUCLEAR CORE DIAGNOSTICS",
  dash_core_temp: "CORE TEMP",
  dash_refresh: "Refresh",
  dash_bot_auto: "● Auto ON",
  dash_bot_manual: "● Manual",
  // Pin lock
  pin_title: "MA TITAN",
  pin_subtitle: "Enter PIN to unlock",
  pin_error_wrong: "Wrong PIN! Try again.",
  pin_locked: "App locked. Try later.",
  pin_placeholder: "PIN",
  pin_enter: "Unlock",
};

const STRINGS: Record<Language, Strings> = { hi: HI, en: EN };

export function useStrings(language: Language): Strings {
  return STRINGS[language];
}
