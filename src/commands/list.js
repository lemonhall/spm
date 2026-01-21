import path from "node:path";
import { loadLockfile } from "../lib/lockfile.js";
import { findPackageRoot } from "../lib/packageRoot.js";
import { formatLockTree } from "../lib/lockTree.js";

export async function commandList(_args, flags, ctx) {
  const root = await findPackageRoot(ctx.cwd);
  const lockPath = path.join(root, ".spm", "spm-lock.json");
  const lock = await loadLockfile(lockPath);
  if (!lock) {
    ctx.stdout.write("No lockfile\n");
    return 0;
  }

  if (flags.tree) {
    ctx.stdout.write(formatLockTree(lock));
    return 0;
  }

  const keys = Object.keys(lock.packages ?? {}).sort();
  for (const key of keys) ctx.stdout.write(`${key}\n`);
  return 0;
}
