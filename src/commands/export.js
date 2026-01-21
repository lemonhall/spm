import path from "node:path";
import { findPackageRoot } from "../lib/packageRoot.js";
import { loadSpmManifest } from "../lib/spmManifest.js";
import { exportFlatSkills } from "../lib/exportFlat.js";

export async function commandExport(_args, flags, ctx) {
  const root = await findPackageRoot(ctx.cwd);
  const manifest = await loadSpmManifest(root);
  const spmSkillsDir = path.join(root, ".spm", "skills", manifest.skillName);
  const outDir = flags.out ?? path.join(root, ".spm", "export", "flat-skills");

  await exportFlatSkills({ entrySkillDir: spmSkillsDir, outDir });
  ctx.stdout.write(`${outDir}\n`);
  return 0;
}

