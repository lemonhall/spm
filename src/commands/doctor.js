import path from "node:path";
import { loadSpmManifest } from "../lib/spmManifest.js";
import { ensureSkillValid } from "../lib/skillSpec.js";

export async function commandDoctor(_args, _flags, ctx) {
  const manifest = await loadSpmManifest(ctx.cwd);
  await ensureSkillValid(ctx.cwd, manifest.skillName);
  ctx.stdout.write("OK\n");
  return 0;
}

