import fs from "node:fs/promises";
import path from "node:path";
import { ensureSkillValid, isValidSkillName } from "../src/lib/skillSpec.js";
import { withTempDir } from "./helpers/tmp.js";

test("skill name validation matches spec subset", () => {
  assert.equal(isValidSkillName("pdf-processing"), true);
  assert.equal(isValidSkillName("PDF-processing"), false);
  assert.equal(isValidSkillName("-pdf"), false);
  assert.equal(isValidSkillName("pdf--processing"), false);
});

test("ensureSkillValid: enforces directory name match", async () => {
  await withTempDir(async (dir) => {
    const skillDir = path.join(dir, "pdf-processing");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---\nname: pdf-processing\ndescription: ok\n---\n\nBody\n`,
      "utf8",
    );
    await ensureSkillValid(skillDir, "pdf-processing");
  });
});
