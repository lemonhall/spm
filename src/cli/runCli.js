import { commandAdd } from "../commands/add.js";
import { commandDoctor } from "../commands/doctor.js";
import { commandExport } from "../commands/export.js";
import { commandInit } from "../commands/init.js";
import { commandInstall } from "../commands/install.js";
import { commandList } from "../commands/list.js";
import { commandPack } from "../commands/pack.js";
import { commandPublish } from "../commands/publish.js";

const HELP = `spm - skill package management

Usage:
  spm init
  spm pack [--out <file.tgz>]
  spm publish --registry <path> [--tarball <file.tgz>]
  spm add <pkg[@range]> --registry <path>
  spm install [--registry <path>] [--update]
  spm list [--tree]
  spm doctor
  spm export [--out <dir>]

Env:
  SPM_REGISTRY=<path>  default registry root
`;

export async function runCli(argv, ctx) {
  ctx.env ??= process.env;
  const { command, args, flags } = parseArgs(argv);
  if (!command || flags.help) {
    ctx.stdout.write(HELP);
    return 0;
  }

  const commands = {
    init: commandInit,
    pack: commandPack,
    publish: commandPublish,
    add: commandAdd,
    install: commandInstall,
    list: commandList,
    doctor: commandDoctor,
    export: commandExport,
  };

  const handler = commands[command];
  if (!handler) {
    ctx.stderr.write(`Unknown command: ${command}\n`);
    ctx.stdout.write(HELP);
    return 2;
  }

  return await handler(args, flags, ctx);
}

function parseArgs(argv) {
  const flags = {};
  const args = [];
  let command = null;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!command && !token.startsWith("-")) {
      command = token;
      continue;
    }

    if (token === "--help" || token === "-h") {
      flags.help = true;
      continue;
    }

    if (token.startsWith("--")) {
      const [rawKey, rawValue] = token.slice(2).split("=", 2);
      if (rawValue !== undefined) {
        flags[rawKey] = rawValue;
        continue;
      }

      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        flags[rawKey] = next;
        i++;
      } else {
        flags[rawKey] = true;
      }
      continue;
    }

    args.push(token);
  }

  return { command, args, flags };
}
