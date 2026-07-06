/**
 * Metro config — pnpm monorepo setup
 *
 * Default getDefaultConfig(__dirname) alone does NOT work in a pnpm
 * workspace. pnpm stores actual packages under the ROOT node_modules/.pnpm/
 * and symlinks them into each workspace package's node_modules/. Without
 * watchFolders + nodeModulesPaths pointing to the workspace root, Metro
 * misses transitive deps → JS bundle is incomplete → app crashes at startup
 * with the native splash stuck on screen forever and no JS code running.
 */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
// Two levels up: artifacts/ma-engineering → artifacts → workspace root
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch workspace root so Metro picks up pnpm-symlinked packages
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from both the app's node_modules AND the workspace root
//    (pnpm hoists the real packages to workspaceRoot/node_modules/.pnpm/)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Follow symlinks — pnpm uses symlinks extensively
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
