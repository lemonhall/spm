import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function withTempDir(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "spm-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

