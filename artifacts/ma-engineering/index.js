import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import React from 'react';

// Must be exported or Fast Refresh won't update the context.
// Official monorepo fix — see docs.expo.dev/router/reference/troubleshooting
// and expo/expo#27299. This bypasses the auto-generated _ctx.android.js
// which cannot resolve EXPO_ROUTER_APP_ROOT in a pnpm monorepo at build time.
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
