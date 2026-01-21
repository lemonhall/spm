import assert from "node:assert/strict";

export function createRunner() {
  const tests = [];

  function test(name, fn) {
    if (typeof name !== "string" || !name) throw new Error("test(name, fn): name required");
    if (typeof fn !== "function") throw new Error("test(name, fn): fn required");
    tests.push({ name, fn });
  }

  async function run() {
    let failed = 0;
    for (const t of tests) {
      try {
        await t.fn({ assert });
        process.stdout.write(`ok - ${t.name}\n`);
      } catch (err) {
        failed++;
        process.stderr.write(`not ok - ${t.name}\n`);
        process.stderr.write(String(err?.stack ?? err) + "\n");
      }
    }
    if (failed) process.exitCode = 1;
  }

  return { test, run, assert };
}

