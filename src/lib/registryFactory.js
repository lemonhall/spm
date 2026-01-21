import { FileRegistry } from "./fileRegistry.js";
import { HttpRegistry } from "./httpRegistry.js";

export function createRegistry(registryRef) {
  const ref = String(registryRef);
  if (ref.startsWith("http://") || ref.startsWith("https://")) return new HttpRegistry(ref);
  return new FileRegistry(ref);
}

