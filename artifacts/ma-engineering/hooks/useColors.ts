import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

/**
 * Returns the design tokens for the app's active theme.
 *
 * MA TITAN ships two hand-picked palettes toggled from Admin Panel
 * (Theme Mode): "neon" (the original dark neon-blue TITAN look) and
 * "bright" (a clean light theme). The choice is stored via ThemeContext
 * (AsyncStorage-backed) rather than following the OS appearance setting,
 * so the in-app toggle always wins.
 */
export function useColors() {
  const { themeMode } = useTheme();
  const palette = themeMode === "bright" ? colors.bright : colors.light;
  return { ...palette, radius: colors.radius };
}
