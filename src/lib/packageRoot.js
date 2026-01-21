import fs from "node:fs/promises";
import path from "node:path";

export async function findPackageRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, "spm.json");
    if (await exists(candidate)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error("Cannot find spm.json (package root) from current directory");
}

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

