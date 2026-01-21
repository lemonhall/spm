const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(markdownText) {
  const match = markdownText.match(FRONTMATTER_RE);
  if (!match) throw new Error("Missing YAML frontmatter (--- ... ---)");

  const yaml = match[1];
  const data = parseSimpleYaml(yaml);
  const body = markdownText.slice(match[0].length);
  return { data, body };
}

// Minimal YAML subset:
// - top-level "key: value"
// - nested map via indentation:
//     metadata:
//       author: x
// - values are treated as strings; quotes are unwrapped.
function parseSimpleYaml(yamlText) {
  const root = {};
  const stack = [{ indent: -1, obj: root }];
  const lines = yamlText.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indent = line.match(/^ */)[0].length;
    const trimmed = line.trim();

    const [keyPart, ...rest] = trimmed.split(":");
    if (!keyPart || rest.length === 0) throw new Error(`Invalid YAML line: ${rawLine}`);
    const key = keyPart.trim();
    const valueRaw = rest.join(":").trim();

    while (stack.length && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1).obj;

    if (valueRaw === "") {
      parent[key] = {};
      stack.push({ indent, obj: parent[key] });
      continue;
    }

    parent[key] = unquote(valueRaw);
  }

  return root;
}

function unquote(text) {
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

