import path from "node:path";
import { readJsonFile } from "./fs.js";

export async function resolveRegistryRoot({ flags, env, packageRoot }) {
  if (flags.registry) return String(flags.registry);
  if (env?.SPM_REGISTRY) return String(env.SPM_REGISTRY);

  const rcPath = path.join(packageRoot, ".spmrc.json");
  try {
    const rc = await readJsonFile(rcPath);
    if (rc?.registry) return String(rc.registry);
  } catch {
    // ignore
  }
  return null;
}

