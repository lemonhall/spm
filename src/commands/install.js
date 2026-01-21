import path from "node:path";
import { loadSpmManifest } from "../lib/spmManifest.js";
import { FileRegistry } from "../lib/fileRegistry.js";
import { ensureDir } from "../lib/fs.js";
import { installTree } from "../lib/installer.js";
import { loadLockfile, saveLockfile } from "../lib/lockfile.js";

export async function commandInstall(_args, flags, ctx) {
  const registryRoot = flags.registry;
  if (!registryRoot) throw new Error("--registry is required");

  const manifest = await loadSpmManifest(ctx.cwd);
  const registry = new FileRegistry(registryRoot);
  const spmDir = path.join(ctx.cwd, ".spm");
  const storeDir = path.join(spmDir, "store");
  const skillsDir = path.join(spmDir, "skills");
  const lockPath = path.join(spmDir, "spm-lock.json");

  await ensureDir(storeDir);
  await ensureDir(skillsDir);

  const lock = (await loadLockfile(lockPath)) ?? {
    lockfileVersion: 1,
    root: { name: manifest.name, skillName: manifest.skillName, version: manifest.version },
    packages: {},
  };

  const result = await installTree({
    projectRoot: ctx.cwd,
    projectSkillDir: ctx.cwd,
    registry,
    manifest,
    storeDir,
    skillsDir,
    lock,
  });

  await saveLockfile(lockPath, result.lock);
  ctx.stdout.write("Installed\n");
  return 0;
}
