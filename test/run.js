import { createRunner } from "./runner.js";

const runner = createRunner();
globalThis.test = runner.test;
globalThis.assert = runner.assert;

await import("./semver.test.js");
await import("./frontmatter.test.js");
await import("./skillSpec.test.js");
await import("./packageRoot.test.js");
await import("./tgz.test.js");
await import("./registry.test.js");
await import("./install.test.js");
await import("./conflict.test.js");
await import("./lockfile.test.js");
await import("./integrity.test.js");
await import("./init.test.js");
await import("./cli.test.js");
await import("./httpRegistry.test.js");
await import("./storeDedupe.test.js");
await import("./export.test.js");
await import("./tgzSecurity.test.js");

await runner.run();
