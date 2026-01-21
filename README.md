# spm

Skill Package Management / Skill Package Manager.

## Dev

- Run tests: `npm test`
- Run CLI: `node ./src/cli.js --help`

## MVP workflow (file registry)

1) Create a skill package (in a directory whose name equals `SKILL.md` frontmatter `name`):

- `spm init`
- `spm pack`

2) Publish to a local registry folder:

- `spm publish --registry E:\skill-registry`

3) Install into a project (creates `.spm/skills/<entry-skill>/deps/...`):

- `spm add @scope/dep-skill@latest --registry E:\skill-registry`
- `spm install --registry E:\skill-registry`
