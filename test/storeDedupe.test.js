import fs from "node:fs/promises";
import path from "node:path";
import { withTempDir } from "./helpers/tmp.js";
import { FileRegistry } from "../src/lib/fileRegistry.js";
import { createTgzFromDir } from "../src/lib/tgz.js";
import { installTree } from "../src/lib/installer.js";

async function writeSkill({ dir, skillName, pkgId, version, dependencies }) {
  const skillDir = path.join(dir, skillName);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(path.join(skillDir, "SKILL.md"), `---\nname: ${skillName}\ndescription: ok\n---\n`, "utf8");
  await fs.writeFile(
    path.join(skillDir, "spm.json"),
    JSON.stringify({ name: pkgId, skillName, version, description: "ok", skill: "SKILL.md", dependencies }, null, 2),
    "utf8",
  );
  return skillDir;
}

test("store: second install reuses extracted cache", async () => {
  await withTempDir(async (dir) => {
    const registryRoot = path.join(dir, "registry");
    const registry = new FileRegistry(registryRoot);

    const depDir = await writeSkill({ dir, skillName: "dep-skill", pkgId: "@s/dep-skill", version: "1.0.0", dependencies: {} });
    const depTgz = path.join(dir, "dep-skill-1.0.0.tgz");
    await createTgzFromDir({ dirPath: depDir, outFile: depTgz, rootName: "dep-skill" });
    await registry.publish({ manifest: { name: "@s/dep-skill", skillName: "dep-skill", version: "1.0.0" }, tarballPath: depTgz });

    const projectRoot = path.join(dir, "project");
    const rootSkillDir = await writeSkill({
      dir: projectRoot,
      skillName: "entry-skill",
      pkgId: "@p/entry-skill",
      version: "0.1.0",
      dependencies: { "@s/dep-skill": "latest" },
    });

    const spmDir = path.join(projectRoot, "entry-skill", ".spm");
    const storeDir = path.join(spmDir, "store");
    const skillsDir = path.join(spmDir, "skills");
    await fs.mkdir(storeDir, { recursive: true });
    await fs.mkdir(skillsDir, { recursive: true });

    const lock1 = { lockfileVersion: 1, root: { name: "@p/entry-skill", skillName: "entry-skill", version: "0.1.0" }, packages: {} };
    await installTree({
      projectSkillDir: rootSkillDir,
      registry,
      manifest: { name: "@p/entry-skill", skillName: "entry-skill", version: "0.1.0", dependencies: { "@s/dep-skill": "latest" } },
      storeDir,
      skillsDir,
      lock: lock1,
    });

    const esc = "@s__dep-skill";
    const firstLevel = path.join(storeDir, esc, "1.0.0");
    const before = await fs.readdir(firstLevel);

    const lock2 = { lockfileVersion: 1, root: { name: "@p/entry-skill", skillName: "entry-skill", version: "0.1.0" }, packages: lock1.packages };
    await installTree({
      projectSkillDir: rootSkillDir,
      registry,
      manifest: { name: "@p/entry-skill", skillName: "entry-skill", version: "0.1.0", dependencies: { "@s/dep-skill": "latest" } },
      storeDir,
      skillsDir,
      lock: lock2,
    });

    const after = await fs.readdir(firstLevel);
    assert.deepEqual(after.sort(), before.sort());
  });
});

