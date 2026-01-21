# SPM（Skill Package Management / Skill Package Manager）设计草案

目标：做一个“像 npm 一样”的技能包管理器，管理以 `SKILL.md` 为核心的技能包；支持依赖（skill 调用 skill）、版本、安装/打包/发布等工作流。

本文件先把讨论收敛成可实现的 MVP 规格；你确认取舍后再进入编码。

---

## 0. 与官方 Agent Skills spec 的对齐（重要）

你贴的官方 spec 对 `SKILL.md`/目录有硬约束，SPM 需要以它为准，否则装出来的技能可能无法被加载：

- 每个 skill 是一个目录，**至少包含 `SKILL.md`**。
- `SKILL.md` 必须包含 **YAML frontmatter** + Markdown body。
- frontmatter 中 `name`/`description` 必填；其中 `name` 有严格规则：
  - 1–64 字符，小写字母/数字/连字符（`a-z0-9-`）；
  - 不能以 `-` 开头/结尾，不能包含 `--`；
  - **必须与父目录名一致**。

因此在 SPM 里要区分两个“名字”：

- **Skill Name**：来自 `SKILL.md` frontmatter 的 `name`（必须满足官方规则，且用于安装目录名）。
- **Package ID**：SPM 用于发布/依赖解析的标识（可以像 npm 一样用 `@scope/name`），但它不等于 Skill Name。

MVP 建议：**1 个 package 提供 1 个 skill**，并要求 `skillName`（或 `provides[0]`）与 `SKILL.md` 的 `name` 一致。

---

## 1. 术语

- **Skill**：一个可被 Agent/Codex/Claude 之类系统加载的“技能”，核心是 `SKILL.md`（以及可选的 `references/`、`scripts/`、`assets/` 等目录）。
- **Skill Package**：可被 SPM 安装/分发的最小单元。建议默认 **1 个 package = 1 个 skill**（先对齐 npm 的心智模型），后续可扩展为“一个包多个 skill”。
- **Registry**：技能包的来源与索引。MVP 先支持 **本地文件 Registry**（离线、可控），后续再加 git/HTTP。
- **Skill Name**：官方 spec 的 skill 标识（`SKILL.md` frontmatter 的 `name`），并且必须等于 skill 目录名。
- **Package ID**：SPM 的包标识，用于依赖/发布（例如 `@scope/my-skill`）。

---

## 2. 目录与文件约定（MVP）

一个技能包目录结构建议：

```
my-skill/             # 目录名必须等于 SKILL.md 的 frontmatter.name
  spm.json
  SKILL.md
  references/...
  scripts/...
  assets/...
```

SPM 额外会生成（项目级）：

```
.spm/
  store/              # 内容缓存（按 name+version 存放解包后的内容）
  skills/             # 实际安装出来可被加载的技能目录（可选）
  spm-lock.json       # 锁定解析结果
```

> 是否安装到全局 `~/.codex/skills`（或 `$CODEX_HOME/skills`）通过 `--global` / `--prefix` 控制。

---

## 3. Manifest：`spm.json`（MVP 版）

最小字段：

```json
{
  "name": "@scope/my-skill",
  "skillName": "my-skill",
  "version": "1.0.0",
  "description": "…",
  "skill": "SKILL.md",
  "dependencies": {
    "@scope/other-skill": "^2.3.0"
  }
}
```

字段建议（可选）：

- `name`：Package ID（建议支持 scope：`@org/name`），用于依赖解析与发布。
- `skillName`：Skill Name（必须匹配 `SKILL.md` frontmatter 的 `name`，也必须匹配包根目录名）。
- `version`：semver（`MAJOR.MINOR.PATCH`）。
- `description` / `keywords` / `author` / `license` / `homepage` / `repository`：纯 meta。
- `skill`：入口 skill 文件路径（相对包根目录）。
- `files`：打包白名单（globs），默认包含 `spm.json` + `SKILL.md` + 常见目录（`references/ scripts/ assets/`）。
- `dependencies`：依赖（包名 -> 版本范围）。
- `peerDependencies`（后续）：运行时必须由宿主提供但不自动安装的依赖。

约束（MVP）：

- `skill` 默认只支持单入口；多 skill 支持留到 v2（可变成 `skills: [{name, entry}]`）。
- `dependencies` 是唯一权威来源；不强制从 `SKILL.md` 自动扫描（可作为辅助命令）。
- `skillName` 必须与 `SKILL.md` 的 frontmatter.name 一致；若 `SKILL.md` 的 `metadata.version` 存在，建议也与 `spm.json` 的 `version` 一致（不一致则 `spm doctor` 报告）。
- 为了降低心智负担（以及让 `deps scan` 更可做），建议约定：`name`（Package ID）的末段应等于 `skillName`（例如 `@scope/my-skill` -> `skillName: "my-skill"`）。

---

## 4. 版本与依赖解析

### 4.1 版本范围（建议）

支持 npm 风格的常用范围：

- `1.2.3` 精确
- `^1.2.3` 兼容更新（不跨 major）
- `~1.2.3` 补丁更新
- `>=1.2.0 <2.0.0` 区间

解析策略（MVP）：

- 在同一依赖名下，选择 **满足范围的最高版本**（npm 风格）。
- 冲突时允许多版本并存（后续做更复杂的 hoist/去重）；MVP 先以“每个包有自己独立的依赖树 + lockfile”实现最稳定。

### 4.2 Lockfile：`.spm/spm-lock.json`

目的：记录“解析后精确版本 + 来源 + 完整依赖树”，确保可复现安装。

建议结构（示例）：

```json
{
  "lockfileVersion": 1,
  "root": { "name": "@scope/my-skill", "skillName": "my-skill", "version": "1.0.0" },
  "packages": {
    "@scope/my-skill@1.0.0": {
      "skillName": "my-skill",
      "dependencies": { "@scope/other-skill": "^2.3.0" }
    },
    "@scope/other-skill@2.3.4": {
      "skillName": "other-skill",
      "resolved": "file:E:/skill-registry/@scope/other-skill/-/other-skill-2.3.4.tgz",
      "integrity": "sha256-…",
      "dependencies": {}
    }
  }
}
```

MVP 约束：

- 安装时优先使用 lockfile；没有 lockfile 才做解析并写入 lockfile。
- `integrity` 用 sha256（文件/包内容哈希）即可。

---

## 5. Registry 与发布（MVP：本地文件 Registry）

### 5.1 Registry 形态

先做一个“文件夹即 registry”：

```
REGISTRY_ROOT/
  @scope/
    my-skill/
      index.json
      -/
        my-skill-1.0.0.tgz
        my-skill-1.1.0.tgz
```

`index.json`（类似 npm）：

```json
{
  "name": "@scope/my-skill",
  "skillName": "my-skill",
  "dist-tags": { "latest": "1.1.0" },
  "versions": {
    "1.0.0": { "dist": { "tarball": "file:.../my-skill-1.0.0.tgz", "integrity": "sha256-..." } },
    "1.1.0": { "dist": { "tarball": "file:.../my-skill-1.1.0.tgz", "integrity": "sha256-..." } }
  }
}
```

MVP 也可以先不做 `index.json`，靠扫描 `-/*.tgz` 建索引；但做了 `index.json` 更接近 npm，也便于后续扩展到 HTTP registry。

### 5.2 打包与发布

- `spm pack`：把包目录打成 `.tgz`（包含 `spm.json`、`SKILL.md`、以及 `files` 白名单命中的内容）。
- `spm publish --registry <path>`：把 `.tgz` 放到 registry 的 `-` 目录，并更新 `index.json`。

安全默认（建议）：

- **默认不执行任何脚本**（不像 npm 的 lifecycle scripts），避免 supply-chain 风险。
- `pack/publish/install` 时做基本校验：`SKILL.md` frontmatter 存在且 `name`/`description` 合规，并且 `name == 目录名 == spm.json.skillName`（若提供）。

---

## 6. CLI 命令设计（MVP）

核心命令（建议先实现这些）：

- `spm init`：在当前目录生成 `spm.json`；可选生成符合官方 spec 的 `SKILL.md` skeleton（含 YAML frontmatter：`name`/`description`）。
- `spm pack`：生成 `*.tgz`。
- `spm publish [--registry <path>]`：发布到本地 registry。
- `spm install`：按 `spm.json` + lockfile 安装依赖。
- `spm add <pkg>@<range> [--save]`：写入 `dependencies` 并安装。
- `spm list`：展示已安装依赖树（从 lockfile）。

可选增强（后续）：

- `spm deps scan`：从 `SKILL.md` 中扫描 `$SkillName` 之类引用，生成候选依赖列表（需要你确认引用语法）。
- `spm doctor`：检查 `spm.json`、lockfile、目录一致性；如果环境里有 `skills-ref`，则调用 `skills-ref validate` 对技能目录做官方校验。

常用参数：

- `--registry <path|url>`：registry 位置（MVP 仅 `file:`/本地路径）。
- `--prefix <path>`：安装目标根目录。
- `--global`：安装到 `$CODEX_HOME/skills`（或 `~/.codex/skills`）。

### 6.1 典型工作流（示例）

创建并发布一个技能包：

```bash
spm init
spm pack
spm publish --registry E:\skill-registry
```

在另一个项目里安装依赖：

```bash
spm add @scope/my-skill@^1.0.0 --registry E:\skill-registry
spm install
```

---

## 7. 安装布局（MVP）

为了避免“安装依赖时覆写别人的 skill 目录”，并且为未来支持同一项目多版本做铺垫，采用类似 npm 的 **嵌套依赖目录**（node_modules 风格）。

为了跨平台/低权限，MVP 仍建议 **copy 安装**（避免 Windows symlink 权限坑）：

- 缓存：`.spm/store/<packageId>/<version>/...`（解包后的内容；这里用 Package ID 组织即可）
- 安装根：`.spm/skills/`（项目内）
- 布局：入口 skill 在顶层；依赖 skill 安装在入口 skill 的 `deps/` 下；依赖的依赖继续递归安装在各自的 `deps/` 下

示例：

```
.spm/
  skills/
    entry-skill/
      SKILL.md
      spm.json
      deps/
        dep-a/
          SKILL.md
          spm.json
          deps/
            dep-b/
              SKILL.md
              spm.json
```

约束：

- 每个 skill 目录名必须等于 `SKILL.md` frontmatter 的 `name`（官方 spec）。
- 在同一个 `deps/` 目录下，`skillName` 必须唯一；如果同一父 skill 同时需要两个版本的同名 skill（极少见但可能），MVP 直接报错。

运行时解析（对宿主的要求）：

- 当一个 skill 引用另一个 skill（按 `skillName`）时，宿主需要按“就近优先”在当前 skill 的 `deps/` 中解析；找不到再向上层 skill 的 `deps/` 回溯（类似 Node 的模块解析）。

---

## 8. 技术架构（实现层面）

建议拆成 5 个核心模块（便于测试与替换）：

1. `manifest`：读取/校验 `spm.json`（基础 schema 校验 + 友好错误）。
2. `registry`：抽象“取某包的可用版本列表/取 tarball”的接口；MVP 实现 `fileRegistry`。
3. `resolver`：semver 解析 + 依赖图构建 + 冲突处理 + 输出 lockfile 数据结构。
4. `store`：下载/校验/解包/缓存（含 `integrity` 校验）。
5. `installer`：把 store 内容复制到目标 skills 目录；生成/更新 lockfile。

CLI 层只做参数解析与输出格式化，所有业务逻辑放在上述模块里。

### 8.1 实现语言建议（方便你拍板）

- **Node.js / TypeScript**：最贴近 npm 心智；处理 JSON、semver、tar 包生态成熟；Windows 兼容也好。
- **Python**：上手快；但 semver/打包生态要多选型，CLI 体验也能做但需要额外工程化。
- **Go**：单文件分发体验最好；实现成本略高，但长远维护和跨平台很好。

---

## 9. 关键待确认点（你回复我这些就能开始编码）

1. 你希望 SPM 用什么语言实现：Node/TypeScript、Python、Go，还是别的？
  使用node来实现吧

2. MVP 的 registry 先只做本地文件夹（`--registry E:\skill-registry`）可以吗？还是必须支持 git/HTTP？
  注册还是需要支持版本化的，所以本地文件夹只是一种缓存机制，远端应该还有一个注册服务，这块尽量参考npm的实现

3. 安装目标：优先装到项目内（`.spm/skills`），还是全局 `$CODEX_HOME/skills`？
  安装目标先实现基于项目的吧，然后之后支持 -g ，glob的

4. 一个包是否只包含一个 `SKILL.md` 入口？还是你明确需要“一包多 skill”？
  当前的SKILL是平铺的，这不利于项目其实，我希望最终引用的SKILL是入口，然后依赖的SKILL，放在子目录下，这样可以不会复写其他的SKILL

  类似于npm处理方式，这样abc这样一个包，在一个项目里就可以引用多个版本号

5. 依赖引用与标识：`SKILL.md` 里按官方 spec 实际只能“调用 skill name”（如 `pdf-processing`）；那 `spm.json.dependencies` 你希望写 **Package ID**（如 `@scope/pdf-processing`）还是直接写 **skill name**？

  SKILL.md里的写法，还是得需要依从官方写法，但，类似于package.json里面的deps，肯定要用唯一ID的形式来表达，否则就乱了；

6. 同名冲突策略：如果不同 Package ID 提供同一个 `skillName`（官方要求目录同名），你希望默认报错，还是允许覆盖/并存（并存需要另找命名方案，可能会违背官方 spec）？

  这个确实是个麻烦，安装时仅报错吧。。暂时不做复杂处理

### 9.1 当前已确认的答案（从你的回复整理）

- 实现语言：Node.js（建议 TypeScript）。
- Registry：长期需要“远端注册服务 + 本地缓存”；MVP 可先做本地文件 registry 作为最小可用/离线形态，但整体接口尽量对齐 npm registry 的思路。
- 安装目标：先项目内（`.spm/skills`），后续再支持 `-g/--global`。
- 依赖表达：`spm.json.dependencies` 用唯一的 **Package ID** 表达（而不是 skill name）。
- 冲突策略：同名 `skillName`（目录同名）先直接报错，不做复杂处理。

### 9.2 仍需一句话确认（影响“子目录依赖/多版本”能否工作）

你提到希望“入口 skill 在顶层、依赖 skill 放在子目录”，并最终支持同一项目多版本（类似 npm）。这在官方 spec 下能否工作，取决于宿主（Codex/Claude/Agent）加载技能时是否：

- **递归扫描** skills 目录（能发现子目录里的 skill）；或
- 支持为一次运行配置多个 skills root（让不同依赖树隔离）。

如果宿主只扫描 `skills/` 的第一层目录且按 `name` 全局唯一解析，那么“同一 `skillName` 多版本并存”无法在运行时成立（只能缓存多版本，但激活时只能选一个）。
你已确认：先假设宿主可以处理（如果不行再去改 opencode 的实现）。

因此 MVP 落地按本设计的 **`deps/` 嵌套依赖布局** 实现，尽量避免覆写，且为多版本留下结构空间；运行时解析/冲突策略则由宿主侧能力决定。

---

## 10. 里程碑建议（MVP -> 可用）

- `v0.1`：`init/pack/publish/install/add/list` + 本地文件 registry + lockfile + copy 安装
- `v0.2`：git source（`git+file://`/`git+https://`）+ 缓存去重
- `v0.3`：HTTP registry（如果你确实需要）
- `v0.4`：`deps scan`、更聪明的去重/hoist、签名/校验强化
