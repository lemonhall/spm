import path from "node:path";
import { writeJsonFile } from "../lib/fs.js";
import { SKILL_SKELETON } from "../lib/skillSkeleton.js";

export async function commandInit(_args, flags, ctx) {
  const dirName = path.basename(ctx.cwd);
  const skillName = flags.skillName ?? dirName;
  const pkgName = flags.name ?? skillName;
  const version = flags.version ?? "0.1.0";
  const description = flags.description ?? "Describe what this skill does and when to use it.";

  const manifestPath = path.join(ctx.cwd, "spm.json");
  await writeJsonFile(manifestPath, {
    name: pkgName,
    skillName,
    version,
    description,
    skill: "SKILL.md",
    dependencies: {},
  });

  if (flags["no-skill"] !== true) {
    const skillPath = path.join(ctx.cwd, "SKILL.md");
    await writeTextIfMissing(skillPath, SKILL_SKELETON({ name: skillName, description }));
  }

  ctx.stdout.write("Initialized spm.json\n");
  return 0;
}

async function writeTextIfMissing(filePath, content) {
  const fs = await import("node:fs/promises");
  try {
    await fs.stat(filePath);
  } catch {
    await fs.writeFile(filePath, content, "utf8");
  }
}

