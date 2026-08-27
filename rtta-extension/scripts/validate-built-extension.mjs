import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputDirectory = resolve(".output/chrome-mv3");
const manifestPath = resolve(outputDirectory, "manifest.json");
const offscreenHtmlPath = resolve(outputDirectory, "offscreen.html");

function fail(message) {
  throw new Error(`[RTTA artifact validation] ${message}`);
}

function read(path) {
  if (!existsSync(path)) {
    fail(`Missing build artifact: ${path}`);
  }
  return readFileSync(path, "utf8");
}

function artifactPath(reference, importerPath) {
  const withoutQuery = reference.split(/[?#]/u, 1)[0];
  return withoutQuery.startsWith("/")
    ? resolve(outputDirectory, withoutQuery.slice(1))
    : resolve(dirname(importerPath), withoutQuery);
}

function collectOffscreenModuleGraph() {
  const html = read(offscreenHtmlPath);
  const pending = [
    ...html.matchAll(
      /(?:src|href)=["']([^"']+\.js(?:[?#][^"']*)?)["']/gu,
    ),
  ].map((match) => artifactPath(match[1], offscreenHtmlPath));
  const visited = new Set();

  while (pending.length > 0) {
    const path = pending.pop();
    if (path === undefined || visited.has(path)) {
      continue;
    }
    visited.add(path);

    const source = read(path);
    for (const match of source.matchAll(
      /["']([^"']+\.js(?:[?#][^"']*)?)["']/gu,
    )) {
      const dependencyPath = artifactPath(match[1], path);
      if (
        dependencyPath.startsWith(outputDirectory) &&
        existsSync(dependencyPath)
      ) {
        pending.push(dependencyPath);
      }
    }
  }

  return [...visited].map((path) => ({ path, source: read(path) }));
}

const manifest = JSON.parse(read(manifestPath));
if (manifest.manifest_version !== 3) {
  fail("Manifest V3 was not preserved.");
}
if (
  !Array.isArray(manifest.permissions) ||
  !manifest.permissions.includes("storage")
) {
  fail('The generated manifest is missing the "storage" permission.');
}

const offscreenModules = collectOffscreenModuleGraph();
const forbiddenPatterns = [
  /\bchrome\s*\.\s*storage\b/u,
  /\bbrowser\s*\.\s*storage\b/u,
  /\bstorage\s*\.\s*local\b/u,
  /rttaHouseholdCode/u,
];

for (const { path, source } of offscreenModules) {
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      fail(`Offscreen module ${path} contains forbidden storage access.`);
    }
  }

  const chromeApis = [
    ...source.matchAll(/\bchrome\s*\.\s*([A-Za-z_$][\w$]*)/gu),
  ].map((match) => match[1]);
  const unsupportedApi = chromeApis.find((api) => api !== "runtime");
  if (unsupportedApi !== undefined) {
    fail(`Offscreen module ${path} uses unsupported chrome.${unsupportedApi}.`);
  }
  if (/\bbrowser\s*\./u.test(source)) {
    fail(`Offscreen module ${path} uses the unsupported browser extension API.`);
  }
}

const audioWorkletSource = read(resolve(outputDirectory, "audio-worklet.js"));
if (/\b(?:chrome|browser)\s*\./u.test(audioWorkletSource)) {
  fail("The AudioWorklet bundle uses an extension API.");
}

const productionEndpoint = process.env.WXT_BACKEND_WS_URL?.trim();
if (productionEndpoint) {
  const allOffscreenSource = offscreenModules
    .map(({ source }) => source)
    .join("\n");
  if (!allOffscreenSource.includes(productionEndpoint)) {
    fail("The configured production WebSocket endpoint is missing from offscreen.");
  }
}

console.info(
  `[RTTA artifact validation] MV3/storage manifest and ${offscreenModules.length} offscreen module(s) verified.`,
);
