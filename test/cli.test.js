import fs from "node:fs/promises";
import path from "node:path";
import { withTempDir } from "./helpers/tmp.js";
import { runCli } from "../src/cli/runCli.js";

function capture() {
  let out = "";
  return {
    stream: { write: (s) => (out += String(s)) },
    text: () => out,
  };
}

test("cli: list --tree prints dependency tree from lockfile", async () => {
  await withTempDir(async (dir) => {
    const skillDir = path.join(dir, "entry-skill");
    await fs.mkdir(path.join(skillDir, ".spm"), { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "spm.json"),
      JSON.stringify({ name: "@p/entry-skill", skillName: "entry-skill", version: "0.1.0", description: "ok", skill: "SKILL.md", dependencies: {} }, null, 2),
      "utf8",
    );
    await fs.writeFile(path.join(skillDir, "SKILL.md"), `---\nname: entry-skill\ndescription: ok\n---\n`, "utf8");

    const lock = {
      lockfileVersion: 1,
      root: { name: "@p/entry-skill", skillName: "entry-skill", version: "0.1.0" },
      packages: {
        "@p/entry-skill@0.1.0": { name: "@p/entry-skill", version: "0.1.0", skillName: "entry-skill", resolved: "workspace", dependencies: { "@s/dep": "1.0.0" } },
        "@s/dep@1.0.0": { name: "@s/dep", version: "1.0.0", skillName: "dep", resolved: "file:x", dependencies: {} },
      },
    };
    await fs.writeFile(path.join(skillDir, ".spm", "spm-lock.json"), JSON.stringify(lock, null, 2), "utf8");

    const stdout = capture();
    const stderr = capture();
    const code = await runCli(["list", "--tree"], { cwd: path.join(skillDir, "scripts"), stdout: stdout.stream, stderr: stderr.stream, env: {} });
    assert.equal(code, 0);
    assert.match(stdout.text(), /- @p\/entry-skill@0\.1\.0/);
    assert.match(stdout.text(), /- @s\/dep@1\.0\.0/);
  });
});

test("cli: install uses SPM_REGISTRY when --registry missing", async () => {
  await withTempDir(async (dir) => {
    const registryRoot = path.join(dir, "registry");
    const skillDir = path.join(dir, "entry-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "spm.json"),
      JSON.stringify({ name: "@p/entry-skill", skillName: "entry-skill", version: "0.1.0", description: "ok", skill: "SKILL.md", dependencies: {} }, null, 2),
      "utf8",
    );
    await fs.writeFile(path.join(skillDir, "SKILL.md"), `---\nname: entry-skill\ndescription: ok\n---\n`, "utf8");

    const stdout = capture();
    const stderr = capture();
    const code = await runCli(["install"], { cwd: skillDir, stdout: stdout.stream, stderr: stderr.stream, env: { SPM_REGISTRY: registryRoot } });
    assert.equal(code, 0);
  });
});

