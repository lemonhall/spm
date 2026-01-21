import path from "node:path";
import { loadSpmManifest } from "../lib/spmManifest.js";
import { ensureSkillValid } from "../lib/skillSpec.js";
import { createTgzFromDir } from "../lib/tgz.js";

export async function commandPack(_args, flags, ctx) {
  const manifest = await loadSpmManifest(ctx.cwd);
  await ensureSkillValid(ctx.cwd, manifest.skillName);

  const out =
    flags.out ??
    path.join(ctx.cwd, `${manifest.skillName}-${manifest.version}.tgz`);

  const baseName = path.basename(ctx.cwd);
  await createTgzFromDir({ dirPath: ctx.cwd, outFile: out, rootName: baseName });
  ctx.stdout.write(`${out}\n`);
  return 0;
}
