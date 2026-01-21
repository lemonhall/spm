import { createRunner } from "./runner.js";

const runner = createRunner();
globalThis.test = runner.test;
globalThis.assert = runner.assert;

await import("./semver.test.js");
await import("./frontmatter.test.js");
await import("./skillSpec.test.js");
await import("./tgz.test.js");
await import("./registry.test.js");
await import("./install.test.js");

await runner.run();
