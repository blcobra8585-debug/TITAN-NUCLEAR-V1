module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    // react-native-reanimated/plugin MUST be last.
    // Without it, useSharedValue / useAnimatedStyle worklet callbacks are NOT
    // transformed for the native thread → silent crash / frozen animations.
    // This applies to Reanimated 3.x and 4.x — babel-preset-expo does NOT
    // auto-include it for 4.x.
    plugins: ["react-native-reanimated/plugin"],
  };
};
