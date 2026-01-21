import path from "node:path";
import { loadSpmManifest, saveSpmManifest } from "../lib/spmManifest.js";
import { parsePackageSpec } from "../lib/spec.js";
import { commandInstall } from "./install.js";

export async function commandAdd(args, flags, ctx) {
  const registryRoot = flags.registry;
  if (!registryRoot) throw new Error("--registry is required");
  const spec = args[0];
  if (!spec) throw new Error("Usage: spm add <pkg[@range]> --registry <path>");

  const { name, range } = parsePackageSpec(spec);
  const manifest = await loadSpmManifest(ctx.cwd);
  manifest.dependencies ??= {};
  manifest.dependencies[name] = range ?? "latest";
  await saveSpmManifest(path.join(ctx.cwd, "spm.json"), manifest);

  return await commandInstall([], flags, ctx);
}

