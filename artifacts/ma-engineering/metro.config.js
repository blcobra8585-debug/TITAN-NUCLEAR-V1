/**
 * Metro config — pnpm monorepo setup (node-linker=hoisted)
 *
 * With node-linker=hoisted in .npmrc, pnpm installs packages flat into
 * node_modules/ (like npm/yarn) instead of the isolated .pnpm/ symlink tree.
 * watchFolders + nodeModulesPaths let Metro see workspace-root packages and
 * cross-package libs even when they live above the app's own directory.
 *
 * blockList: a plain RegExp (no extra package imports needed) that prevents
 * Metro from traversing the TITAN-NUCLEAR-V1/ nested folder that was
 * accidentally committed to git in older rounds. Without this, Metro walks
 * into a second full copy of every app source file and can produce resolver
 * cache collisions or bundle the wrong file version → broken JS bundle →
 * app stuck on splash screen forever.
 */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
// Two levels up: artifacts/ma-engineering → artifacts → workspace root
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch workspace root so Metro picks up workspace-root packages
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from both the app's node_modules AND the workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Follow symlinks — pnpm still uses symlinks for workspace-local packages
config.resolver.unstable_enableSymlinks = true;

// 4. Block the accidentally-committed nested repo copy.
//    Plain RegExp — no extra require() needed, works with any Metro version.
config.resolver.blockList = new RegExp(
  path.resolve(workspaceRoot, "TITAN-NUCLEAR-V1").replace(/[/\\]/g, "[/\\\\]") + "[/\\\\]"
);

module.exports = config;
