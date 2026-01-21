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

test("install: conflicting same skillName under one deps/ fails", async () => {
  await withTempDir(async (dir) => {
    const registryRoot = path.join(dir, "registry");
    const registry = new FileRegistry(registryRoot);

    const aDir = await writeSkill({ dir, skillName: "same-skill", pkgId: "@a/same", version: "1.0.0", dependencies: {} });
    const aTgz = path.join(dir, "a.tgz");
    await createTgzFromDir({ dirPath: aDir, outFile: aTgz, rootName: "same-skill" });
    await registry.publish({ manifest: { name: "@a/same", skillName: "same-skill", version: "1.0.0" }, tarballPath: aTgz });

    const bDir = await writeSkill({ dir, skillName: "same-skill", pkgId: "@b/same", version: "1.0.0", dependencies: {} });
    const bTgz = path.join(dir, "b.tgz");
    await createTgzFromDir({ dirPath: bDir, outFile: bTgz, rootName: "same-skill" });
    await registry.publish({ manifest: { name: "@b/same", skillName: "same-skill", version: "1.0.0" }, tarballPath: bTgz });

    const projectRoot = path.join(dir, "project");
    const rootSkillDir = await writeSkill({
      dir: projectRoot,
      skillName: "entry-skill",
      pkgId: "@p/entry-skill",
      version: "0.1.0",
      dependencies: { "@a/same": "latest", "@b/same": "latest" },
    });

    const spmDir = path.join(projectRoot, "entry-skill", ".spm");
    const storeDir = path.join(spmDir, "store");
    const skillsDir = path.join(spmDir, "skills");
    await fs.mkdir(storeDir, { recursive: true });
    await fs.mkdir(skillsDir, { recursive: true });

    const lock = { lockfileVersion: 1, root: { name: "@p/entry-skill", skillName: "entry-skill", version: "0.1.0" }, packages: {} };

    await assert.rejects(
      () =>
        installTree({
          projectSkillDir: rootSkillDir,
          registry,
          manifest: { name: "@p/entry-skill", skillName: "entry-skill", version: "0.1.0", dependencies: { "@a/same": "latest", "@b/same": "latest" } },
          storeDir,
          skillsDir,
          lock,
        }),
      /conflict/i,
    );
  });
});

