import { parseFrontmatter } from "../src/lib/frontmatter.js";

test("frontmatter: parses yaml + body", () => {
  const md = `---\nname: pdf-processing\ndescription: Works with PDFs\nmetadata:\n  author: example\n---\n\nHello\n`;
  const { data, body } = parseFrontmatter(md);
  assert.equal(data.name, "pdf-processing");
  assert.equal(data.description, "Works with PDFs");
  assert.deepEqual(data.metadata, { author: "example" });
  assert.equal(body.trim(), "Hello");
});
