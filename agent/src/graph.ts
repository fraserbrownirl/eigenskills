/**
 * Skill Graph Module
 *
 * Fetches graph nodes (markdown files) from the registry for progressive
 * skill discovery. The agent explores the graph via the explore_skills tool
 * before selecting skills.
 *
 * Graph files live in registry/graph/ and contain:
 * - YAML frontmatter with id, description, skills[], links[]
 * - Prose body with [[wikilinks]] explaining when/why to follow paths
 */

import { readFileSync, existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { spawnSync } from "child_process";

const GRAPH_CACHE_DIR = "/tmp/skillsseal-graph";
const DEFAULT_REGISTRY_REPO = "https://github.com/fraserbrownirl/eigenskills-v2.git";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  content: string;
  fetchedAt: number;
}

const graphCache = new Map<string, CacheEntry>();
let indexCache: CacheEntry | null = null;

function getLocalRegistryPath(): string | undefined {
  return process.env.SKILL_REGISTRY_LOCAL;
}

function getRegistryRepo(): string {
  return process.env.SKILL_REGISTRY_REPO ?? DEFAULT_REGISTRY_REPO;
}

function isCacheValid(entry: CacheEntry | null | undefined): entry is CacheEntry {
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

/**
 * Fetch a graph file from local registry or remote repo.
 * Returns the raw markdown content.
 */
function fetchGraphFile(filename: string): string | null {
  const localPath = getLocalRegistryPath();

  if (localPath) {
    const filePath = resolve(localPath, "..", "graph", filename);
    if (existsSync(filePath)) {
      return readFileSync(filePath, "utf-8");
    }
    return null;
  }

  mkdirSync(GRAPH_CACHE_DIR, { recursive: true });

  const repoDir = join(GRAPH_CACHE_DIR, "_repo");
  const registryRepo = getRegistryRepo();

  if (!existsSync(repoDir)) {
    const result = spawnSync("git", [
      "clone",
      "--depth",
      "1",
      "--filter=blob:none",
      "--sparse",
      registryRepo,
      repoDir,
    ]);
    if (result.status !== 0) {
      console.error(`Failed to clone registry: ${result.stderr?.toString()}`);
      return null;
    }
  }

  const sparseResult = spawnSync("git", ["sparse-checkout", "add", "registry/graph"], {
    cwd: repoDir,
  });
  if (sparseResult.status !== 0) {
    console.error(`Failed to checkout graph: ${sparseResult.stderr?.toString()}`);
    return null;
  }

  const filePath = join(repoDir, "registry", "graph", filename);
  if (!existsSync(filePath)) {
    return null;
  }

  return readFileSync(filePath, "utf-8");
}

/**
 * Fetch a graph node by ID (e.g., "defi", "aave-lending", "x402-payments").
 * Returns the markdown content or null if not found.
 */
export async function fetchGraphNode(nodeId: string): Promise<string | null> {
  const safeNodeId = nodeId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (safeNodeId !== nodeId) {
    return null;
  }

  const cached = graphCache.get(nodeId);
  if (isCacheValid(cached)) {
    return cached.content;
  }

  const filename = `${nodeId}.md`;
  const content = fetchGraphFile(filename);

  if (content) {
    graphCache.set(nodeId, { content, fetchedAt: Date.now() });
  }

  return content;
}

/**
 * Fetch the graph index (index.md).
 * This is the entry point injected into the system prompt.
 */
export async function fetchGraphIndex(): Promise<string> {
  if (isCacheValid(indexCache)) {
    return indexCache.content;
  }

  const content = fetchGraphFile("index.md");

  if (!content) {
    return "# Skill Graph\n\nGraph index not available.";
  }

  indexCache = { content, fetchedAt: Date.now() };
  return content;
}

/**
 * Extract [[wikilinks]] from markdown content.
 * Returns array of link targets (without brackets).
 */
export function resolveWikilinks(content: string): string[] {
  const matches = content.matchAll(/\[\[([^\]]+)\]\]/g);
  const links: string[] = [];

  for (const match of matches) {
    const target = match[1].trim();
    if (target && !links.includes(target)) {
      links.push(target);
    }
  }

  return links;
}

/**
 * Clear the graph cache. Useful for testing or forcing refresh.
 */
export function clearGraphCache(): void {
  graphCache.clear();
  indexCache = null;
}
