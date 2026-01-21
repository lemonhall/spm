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

test("install: nested deps layout under deps/", async () => {
  await withTempDir(async (dir) => {
    const registryRoot = path.join(dir, "registry");
    const registry = new FileRegistry(registryRoot);

    const dep2Dir = await writeSkill({ dir, skillName: "dep-b", pkgId: "@s/dep-b", version: "1.0.0", dependencies: {} });
    const dep2Tgz = path.join(dir, "dep-b-1.0.0.tgz");
    await createTgzFromDir({ dirPath: dep2Dir, outFile: dep2Tgz, rootName: "dep-b" });
    await registry.publish({ manifest: { name: "@s/dep-b", skillName: "dep-b", version: "1.0.0" }, tarballPath: dep2Tgz });

    const dep1Dir = await writeSkill({ dir, skillName: "dep-a", pkgId: "@s/dep-a", version: "1.0.0", dependencies: { "@s/dep-b": "latest" } });
    const dep1Tgz = path.join(dir, "dep-a-1.0.0.tgz");
    await createTgzFromDir({ dirPath: dep1Dir, outFile: dep1Tgz, rootName: "dep-a" });
    await registry.publish({ manifest: { name: "@s/dep-a", skillName: "dep-a", version: "1.0.0" }, tarballPath: dep1Tgz });

    const projectRoot = path.join(dir, "project");
    const rootSkillDir = await writeSkill({ dir: projectRoot, skillName: "entry-skill", pkgId: "@p/entry-skill", version: "0.1.0", dependencies: { "@s/dep-a": "latest" } });

    const spmDir = path.join(projectRoot, "entry-skill", ".spm");
    const storeDir = path.join(spmDir, "store");
    const skillsDir = path.join(spmDir, "skills");
    await fs.mkdir(storeDir, { recursive: true });
    await fs.mkdir(skillsDir, { recursive: true });

    const lock = { lockfileVersion: 1, root: { name: "@p/entry-skill", skillName: "entry-skill", version: "0.1.0" }, packages: {} };
    await installTree({
      projectSkillDir: rootSkillDir,
      registry,
      manifest: { name: "@p/entry-skill", skillName: "entry-skill", version: "0.1.0", dependencies: { "@s/dep-a": "latest" } },
      storeDir,
      skillsDir,
      lock,
    });

    const depAInstalled = path.join(skillsDir, "entry-skill", "deps", "dep-a", "SKILL.md");
    const depBInstalled = path.join(skillsDir, "entry-skill", "deps", "dep-a", "deps", "dep-b", "SKILL.md");
    assert.equal(await fs.readFile(depAInstalled, "utf8") != null, true);
    assert.equal(await fs.readFile(depBInstalled, "utf8") != null, true);
  });
});

