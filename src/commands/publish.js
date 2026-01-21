import path from "node:path";
import { loadSpmManifest } from "../lib/spmManifest.js";
import { ensureSkillValid } from "../lib/skillSpec.js";
import { createTgzFromDir } from "../lib/tgz.js";
import { findPackageRoot } from "../lib/packageRoot.js";
import { resolveRegistryRoot } from "../lib/config.js";
import { createRegistry } from "../lib/registryFactory.js";

export async function commandPublish(_args, flags, ctx) {
  const root = await findPackageRoot(ctx.cwd);
  const registryRoot = await resolveRegistryRoot({ flags, env: ctx.env, packageRoot: root });
  if (!registryRoot) throw new Error("--registry is required (or set SPM_REGISTRY / .spmrc.json)");

  const manifest = await loadSpmManifest(root);
  await ensureSkillValid(root, manifest.skillName);

  const tarball =
    flags.tarball ??
    path.join(root, `${manifest.skillName}-${manifest.version}.tgz`);

  if (!flags.tarball) {
    const baseName = path.basename(root);
    await createTgzFromDir({ dirPath: root, outFile: tarball, rootName: baseName });
  }

  const registry = createRegistry(registryRoot);
  await registry.publish({ manifest, tarballPath: tarball });
  ctx.stdout.write(`Published ${manifest.name}@${manifest.version}\n`);
  return 0;
}
