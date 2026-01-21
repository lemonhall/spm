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

test("lockfile: pinned version is used even if latest changes", async () => {
  await withTempDir(async (dir) => {
    const registryRoot = path.join(dir, "registry");
    const registry = new FileRegistry(registryRoot);

    const depV1Dir = await writeSkill({ dir, skillName: "dep-skill", pkgId: "@s/dep-skill", version: "1.0.0", dependencies: {} });
    const depV1Tgz = path.join(dir, "dep-skill-1.0.0.tgz");
    await createTgzFromDir({ dirPath: depV1Dir, outFile: depV1Tgz, rootName: "dep-skill" });
    await registry.publish({ manifest: { name: "@s/dep-skill", skillName: "dep-skill", version: "1.0.0" }, tarballPath: depV1Tgz });

    const depV2Dir = await writeSkill({ dir, skillName: "dep-skill", pkgId: "@s/dep-skill", version: "2.0.0", dependencies: {} });
    const depV2Tgz = path.join(dir, "dep-skill-2.0.0.tgz");
    await createTgzFromDir({ dirPath: depV2Dir, outFile: depV2Tgz, rootName: "dep-skill" });
    await registry.publish({ manifest: { name: "@s/dep-skill", skillName: "dep-skill", version: "2.0.0" }, tarballPath: depV2Tgz });

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

    const rootKey = "@p/entry-skill@0.1.0";
    const lock = {
      lockfileVersion: 1,
      root: { name: "@p/entry-skill", skillName: "entry-skill", version: "0.1.0" },
      packages: {
        [rootKey]: {
          name: "@p/entry-skill",
          version: "0.1.0",
          skillName: "entry-skill",
          resolved: "workspace",
          dependencies: { "@s/dep-skill": "1.0.0" },
        },
      },
    };

    await installTree({
      projectSkillDir: rootSkillDir,
      registry,
      manifest: { name: "@p/entry-skill", skillName: "entry-skill", version: "0.1.0", dependencies: { "@s/dep-skill": "latest" } },
      storeDir,
      skillsDir,
      lock,
    });

    const depManifest = JSON.parse(
      await fs.readFile(path.join(skillsDir, "entry-skill", "deps", "dep-skill", "spm.json"), "utf8"),
    );
    assert.equal(depManifest.version, "1.0.0");
  });
});

