import fs from "node:fs/promises";
import path from "node:path";
import { withTempDir } from "./helpers/tmp.js";
import { findPackageRoot } from "../src/lib/packageRoot.js";

test("package root: finds nearest spm.json upwards", async () => {
  await withTempDir(async (dir) => {
    const root = path.join(dir, "a", "b", "skill");
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, "spm.json"), "{}", "utf8");

    const nested = path.join(root, "scripts");
    await fs.mkdir(nested, { recursive: true });
    assert.equal(await findPackageRoot(nested), root);
  });
});

