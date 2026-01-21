export function parsePackageSpec(input) {
  const m = input.match(/^(?<name>@[^/]+\/[^@]+|[^@]+)(?:@(?<range>.+))?$/);
  if (!m?.groups?.name) throw new Error(`Invalid package spec: ${input}`);
  return { name: m.groups.name, range: m.groups.range };
}

