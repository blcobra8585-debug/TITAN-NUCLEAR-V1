/**
 * Metro config — pnpm monorepo setup (node-linker=hoisted)
 *
 * With node-linker=hoisted in .npmrc, pnpm installs packages flat into
 * node_modules/ (like npm/yarn) instead of the isolated .pnpm/ symlink tree.
 * This makes Metro's default resolver work for the vast majority of packages,
 * but we still need watchFolders + nodeModulesPaths so Metro can see workspace-
 * root packages and cross-package libs.
 *
 * blockList: excludes the TITAN-NUCLEAR-V1/ nested folder (an old committed
 * copy of the entire repo) from Metro's file traversal. Without this, Metro
 * walks into a second copy of every app file and can produce resolver cache
 * collisions or bundle the wrong file version, which causes the JS bundle to
 * be incomplete → app stuck on splash screen forever.
 */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const { exclusionList } = require("metro-config");

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

// 3. Follow symlinks — pnpm still uses symlinks for workspace packages
config.resolver.unstable_enableSymlinks = true;

// 4. Block the accidentally-committed nested repo copy from Metro's file traversal.
//    Without this, Metro sees every source file twice and can resolve the wrong one.
const nestedRepoPattern = new RegExp(
  path.resolve(workspaceRoot, "TITAN-NUCLEAR-V1").replace(/[/\\]/g, "[/\\\\]")
);
config.resolver.blockList = exclusionList([nestedRepoPattern]);

module.exports = config;
