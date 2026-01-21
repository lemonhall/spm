import fs from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter } from "./frontmatter.js";

export function isValidSkillName(name) {
  if (typeof name !== "string") return false;
  if (name.length < 1 || name.length > 64) return false;
  if (name.startsWith("-") || name.endsWith("-")) return false;
  if (name.includes("--")) return false;
  return /^[a-z0-9-]+$/.test(name);
}

export async function ensureSkillValid(skillDir, expectedSkillName) {
  const dirName = path.basename(skillDir);
  const skillPath = path.join(skillDir, "SKILL.md");
  const text = await fs.readFile(skillPath, "utf8");
  const { data } = parseFrontmatter(text);

  const name = data.name;
  const description = data.description;
  if (!isValidSkillName(name)) throw new Error(`Invalid skill name in SKILL.md: ${name}`);
  if (!description || typeof description !== "string" || description.length > 1024) {
    throw new Error("Invalid or missing description in SKILL.md");
  }
  if (name !== dirName) throw new Error(`SKILL.md name must match directory: ${dirName}`);
  if (expectedSkillName && name !== expectedSkillName) {
    throw new Error(`SKILL.md name (${name}) must match spm.json.skillName (${expectedSkillName})`);
  }
}

