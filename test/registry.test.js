import fs from "node:fs/promises";
import path from "node:path";
import { withTempDir } from "./helpers/tmp.js";
import { FileRegistry } from "../src/lib/fileRegistry.js";
import { createTgzFromDir } from "../src/lib/tgz.js";

test("file registry: publish and resolve", async () => {
  await withTempDir(async (dir) => {
    const registryRoot = path.join(dir, "registry");
    const skillDir = path.join(dir, "dep-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, "SKILL.md"), `---\nname: dep-skill\ndescription: ok\n---\n`, "utf8");
    await fs.writeFile(
      path.join(skillDir, "spm.json"),
      JSON.stringify({ name: "@scope/dep-skill", skillName: "dep-skill", version: "1.0.0", description: "ok", skill: "SKILL.md", dependencies: {} }, null, 2),
      "utf8",
    );

    const tgz = path.join(dir, "dep-skill-1.0.0.tgz");
    await createTgzFromDir({ dirPath: skillDir, outFile: tgz, rootName: "dep-skill" });

    const r = new FileRegistry(registryRoot);
    await r.publish({ manifest: { name: "@scope/dep-skill", skillName: "dep-skill", version: "1.0.0" }, tarballPath: tgz });

    const resolved = await r.resolve({ packageId: "@scope/dep-skill", range: "latest" });
    assert.equal(resolved.version, "1.0.0");
    assert.equal(resolved.skillName, "dep-skill");
  });
});

