import path from "node:path";
import { loadSpmManifest } from "../lib/spmManifest.js";
import { ensureSkillValid } from "../lib/skillSpec.js";
import { findPackageRoot } from "../lib/packageRoot.js";

export async function commandDoctor(_args, _flags, ctx) {
  const root = await findPackageRoot(ctx.cwd);
  const manifest = await loadSpmManifest(root);
  await ensureSkillValid(root, manifest.skillName);
  ctx.stdout.write("OK\n");
  return 0;
}
