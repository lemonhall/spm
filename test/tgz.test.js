import fs from "node:fs/promises";
import path from "node:path";
import { withTempDir } from "./helpers/tmp.js";
import { createTgzFromDir, extractTgzToDir } from "../src/lib/tgz.js";

test("tgz: pack and extract keeps files", async () => {
  await withTempDir(async (dir) => {
    const skillDir = path.join(dir, "pdf-processing");
    await fs.mkdir(path.join(skillDir, "references"), { recursive: true });
    await fs.writeFile(path.join(skillDir, "SKILL.md"), `---\nname: pdf-processing\ndescription: ok\n---\n`, "utf8");
    await fs.writeFile(path.join(skillDir, "references", "REFERENCE.md"), "hello", "utf8");

    const tgz = path.join(dir, "out.tgz");
    await createTgzFromDir({ dirPath: skillDir, outFile: tgz, rootName: "pdf-processing" });

    const outDir = path.join(dir, "out");
    await fs.mkdir(outDir, { recursive: true });
    await extractTgzToDir({ tgzFile: tgz, outDir });

    const extracted = path.join(outDir, "pdf-processing", "references", "REFERENCE.md");
    const text = await fs.readFile(extracted, "utf8");
    assert.equal(text, "hello");
  });
});

