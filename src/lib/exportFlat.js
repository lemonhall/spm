import fs from "node:fs/promises";
import path from "node:path";
import { copyDir, ensureDir, readJsonFile } from "./fs.js";
import { ensureSkillValid } from "./skillSpec.js";

export async function exportFlatSkills({ entrySkillDir, outDir }) {
  if (!(await exists(entrySkillDir))) {
    throw new Error(`Entry skill not installed: ${entrySkillDir} (run spm install first)`);
  }

  const seen = new Map(); // skillName -> { dir, pkgId, version }
  await walk(entrySkillDir);

  await ensureDir(outDir);
  for (const [skillName, meta] of seen.entries()) {
    const dest = path.join(outDir, skillName);
    if (!(await exists(dest))) await copyDir(meta.dir, dest);
  }

  async function walk(skillDir) {
    await ensureSkillValid(skillDir);
    const spmPath = path.join(skillDir, "spm.json");
    const manifest = await tryReadJson(spmPath);

    const skillName = path.basename(skillDir);
    const pkgId = manifest?.name ?? null;
    const version = manifest?.version ?? null;

    const existing = seen.get(skillName);
    if (existing) {
      if (existing.pkgId !== pkgId || existing.version !== version) {
        throw new Error(
          `Flat export conflict for ${skillName}: ${existing.pkgId}@${existing.version} vs ${pkgId}@${version}`,
        );
      }
    } else {
      seen.set(skillName, { dir: skillDir, pkgId, version });
    }

    const depsDir = path.join(skillDir, "deps");
    if (!(await exists(depsDir))) return;
    const entries = await fs.readdir(depsDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      await walk(path.join(depsDir, e.name));
    }
  }
}

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function tryReadJson(p) {
  try {
    return await readJsonFile(p);
  } catch {
    return null;
  }
}

