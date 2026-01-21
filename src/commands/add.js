import path from "node:path";
import { loadSpmManifest, saveSpmManifest } from "../lib/spmManifest.js";
import { parsePackageSpec } from "../lib/spec.js";
import { commandInstall } from "./install.js";
import { findPackageRoot } from "../lib/packageRoot.js";
import { resolveRegistryRoot } from "../lib/config.js";

export async function commandAdd(args, flags, ctx) {
  const spec = args[0];
  if (!spec) throw new Error("Usage: spm add <pkg[@range]> --registry <path>");

  const root = await findPackageRoot(ctx.cwd);
  const registryRoot = await resolveRegistryRoot({ flags, env: ctx.env, packageRoot: root });
  if (!registryRoot) throw new Error("--registry is required (or set SPM_REGISTRY / .spmrc.json)");

  const { name, range } = parsePackageSpec(spec);
  const manifest = await loadSpmManifest(root);
  manifest.dependencies ??= {};
  manifest.dependencies[name] = range ?? "latest";
  await saveSpmManifest(path.join(root, "spm.json"), manifest);

  return await commandInstall([], flags, ctx);
}
