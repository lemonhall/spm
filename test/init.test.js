import fs from "node:fs/promises";
import path from "node:path";
import { withTempDir } from "./helpers/tmp.js";
import { commandInit } from "../src/commands/init.js";
import { ensureSkillValid } from "../src/lib/skillSpec.js";

test("init: creates spm.json and valid SKILL.md", async () => {
  await withTempDir(async (dir) => {
    const skillDir = path.join(dir, "pdf-processing");
    await fs.mkdir(skillDir, { recursive: true });

    await commandInit([], {}, { cwd: skillDir, stdout: process.stdout, stderr: process.stderr });

    const manifest = JSON.parse(await fs.readFile(path.join(skillDir, "spm.json"), "utf8"));
    assert.equal(manifest.skillName, "pdf-processing");
    assert.equal(manifest.skill, "SKILL.md");

    await ensureSkillValid(skillDir, "pdf-processing");
  });
});

