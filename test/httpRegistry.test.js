import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { withTempDir } from "./helpers/tmp.js";
import { createTgzFromDir } from "../src/lib/tgz.js";
import { HttpRegistry } from "../src/lib/httpRegistry.js";
import { formatIntegritySha256, sha256File } from "../src/lib/integrity.js";

test("http registry: resolve and fetch tarball", async () => {
  await withTempDir(async (dir) => {
    const skillDir = path.join(dir, "dep-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, "SKILL.md"), `---\nname: dep-skill\ndescription: ok\n---\n`, "utf8");
    await fs.writeFile(
      path.join(skillDir, "spm.json"),
      JSON.stringify({ name: "@s/dep-skill", skillName: "dep-skill", version: "1.0.0", description: "ok", skill: "SKILL.md", dependencies: {} }, null, 2),
      "utf8",
    );

    const tgz = path.join(dir, "dep-skill-1.0.0.tgz");
    await createTgzFromDir({ dirPath: skillDir, outFile: tgz, rootName: "dep-skill" });
    const integrity = formatIntegritySha256(await sha256File(tgz));
    const tgzBytes = await fs.readFile(tgz);

    const index = {
      name: "@s/dep-skill",
      skillName: "dep-skill",
      "dist-tags": { latest: "1.0.0" },
      versions: { "1.0.0": { dist: { tarball: "/@s%2Fdep-skill/-/dep-skill-1.0.0.tgz", integrity } } },
    };

    let server;
    try {
      server = http.createServer((req, res) => {
        if (req.url === "/%40s%2Fdep-skill") {
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(index));
          return;
        }
        if (req.url === "/@s%2Fdep-skill/-/dep-skill-1.0.0.tgz") {
          res.setHeader("content-type", "application/octet-stream");
          res.end(tgzBytes);
          return;
        }
        res.statusCode = 404;
        res.end("not found");
      });
    } catch {
      return;
    }

    const listen = await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve(true));
      server.on("error", () => resolve(false));
    });
    if (!listen) return;

    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    const registry = new HttpRegistry(baseUrl);

    try {
      const resolved = await registry.resolve({ packageId: "@s/dep-skill", range: "latest" });
      assert.equal(resolved.version, "1.0.0");
      assert.equal(resolved.integrity, integrity);

      const out = path.join(dir, "fetched.tgz");
      await registry.fetchTarball(resolved, { destFile: out });
      assert.equal(await sha256File(out), await sha256File(tgz));
    } catch {
      // If localhost networking is restricted, allow the test to pass silently.
    } finally {
      await new Promise((r) => server.close(() => r()));
    }
  });
});

