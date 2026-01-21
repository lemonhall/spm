import path from "node:path";
import { loadLockfile } from "../lib/lockfile.js";

export async function commandList(_args, _flags, ctx) {
  const lockPath = path.join(ctx.cwd, ".spm", "spm-lock.json");
  const lock = await loadLockfile(lockPath);
  if (!lock) {
    ctx.stdout.write("No lockfile\n");
    return 0;
  }

  const keys = Object.keys(lock.packages ?? {}).sort();
  for (const key of keys) ctx.stdout.write(`${key}\n`);
  return 0;
}

