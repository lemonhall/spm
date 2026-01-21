import path from "node:path";
import { loadSpmManifest } from "../lib/spmManifest.js";
import { ensureSkillValid } from "../lib/skillSpec.js";
import { createTgzFromDir } from "../lib/tgz.js";
import { FileRegistry } from "../lib/fileRegistry.js";

export async function commandPublish(_args, flags, ctx) {
  const registryRoot = flags.registry;
  if (!registryRoot) throw new Error("--registry is required");

  const manifest = await loadSpmManifest(ctx.cwd);
  await ensureSkillValid(ctx.cwd, manifest.skillName);

  const tarball =
    flags.tarball ??
    path.join(ctx.cwd, `${manifest.skillName}-${manifest.version}.tgz`);

  if (!flags.tarball) {
    const baseName = path.basename(ctx.cwd);
    await createTgzFromDir({ dirPath: ctx.cwd, outFile: tarball, rootName: baseName });
  }

  const registry = new FileRegistry(registryRoot);
  await registry.publish({ manifest, tarballPath: tarball });
  ctx.stdout.write(`Published ${manifest.name}@${manifest.version}\n`);
  return 0;
}
