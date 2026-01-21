#!/usr/bin/env node
import { runCli } from "./cli/runCli.js";

await runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  stdout: process.stdout,
  stderr: process.stderr,
});

