import path from "node:path";
import { loadSpmManifest } from "../lib/spmManifest.js";
import { ensureDir } from "../lib/fs.js";
import { installTree } from "../lib/installer.js";
import { loadLockfile, saveLockfile } from "../lib/lockfile.js";
import { findPackageRoot } from "../lib/packageRoot.js";
import { resolveRegistryRoot } from "../lib/config.js";
import { createRegistry } from "../lib/registryFactory.js";

export async function commandInstall(_args, flags, ctx) {
  const root = await findPackageRoot(ctx.cwd);
  const registryRoot = await resolveRegistryRoot({ flags, env: ctx.env, packageRoot: root });
  if (!registryRoot) throw new Error("--registry is required (or set SPM_REGISTRY / .spmrc.json)");

  const manifest = await loadSpmManifest(root);
  const registry = createRegistry(registryRoot);
  const spmDir = path.join(root, ".spm");
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
    projectRoot: root,
    projectSkillDir: root,
    registry,
    manifest,
    storeDir,
    skillsDir,
    lock,
    useLock: flags.update ? false : true,
  });

  await saveLockfile(lockPath, result.lock);
  ctx.stdout.write("Installed\n");
  return 0;
}
