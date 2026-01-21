import path from "node:path";
import { loadSpmManifest } from "../lib/spmManifest.js";
import { ensureSkillValid } from "../lib/skillSpec.js";
import { createTgzFromDir } from "../lib/tgz.js";
import { findPackageRoot } from "../lib/packageRoot.js";

export async function commandPack(_args, flags, ctx) {
  const root = await findPackageRoot(ctx.cwd);
  const manifest = await loadSpmManifest(root);
  await ensureSkillValid(root, manifest.skillName);

  const out =
    flags.out ??
    path.join(root, `${manifest.skillName}-${manifest.version}.tgz`);

  const baseName = path.basename(root);
  await createTgzFromDir({ dirPath: root, outFile: out, rootName: baseName });
  ctx.stdout.write(`${out}\n`);
  return 0;
}
