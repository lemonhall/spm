import fs from "node:fs/promises";
import path from "node:path";
import { withTempDir } from "./helpers/tmp.js";
import { exportFlatSkills } from "../src/lib/exportFlat.js";

async function writeSkillDir(dir, name) {
  const d = path.join(dir, name);
  await fs.mkdir(d, { recursive: true });
  await fs.writeFile(path.join(d, "SKILL.md"), `---\nname: ${name}\ndescription: ok\n---\n`, "utf8");
  await fs.writeFile(path.join(d, "spm.json"), JSON.stringify({ name: `@s/${name}`, skillName: name, version: "1.0.0", description: "ok", skill: "SKILL.md", dependencies: {} }, null, 2), "utf8");
  return d;
}

test("export: exports nested deps into flat directory", async () => {
  await withTempDir(async (dir) => {
    const entry = await writeSkillDir(dir, "entry-skill");
    const depA = await writeSkillDir(path.join(entry, "deps"), "dep-a");
    await writeSkillDir(path.join(depA, "deps"), "dep-b");

    const out = path.join(dir, "flat");
    await exportFlatSkills({ entrySkillDir: entry, outDir: out });

    const names = (await fs.readdir(out)).sort();
    assert.deepEqual(names, ["dep-a", "dep-b", "entry-skill"]);
  });
});

