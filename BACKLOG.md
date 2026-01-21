# SPM Backlog

原则

- 先跑通最小闭环：`init -> pack -> publish -> add/install -> list/doctor`。
- TDD：每个条目都要新增/收紧测试用例。
- 模块化：单模块尽量 ~100 行；超了就按职责拆（parser/resolver/store/installer/registry/cli）。

---

## P0（优先做）

### 1）明确“包根目录”发现规则（Project vs Skill）

目标：在任意子目录运行命令，行为一致。

任务：
- 实现 `findPackageRoot()`：向上查找 `spm.json` 作为 package root。
- `install/add/list/doctor/pack/publish` 全部统一使用该逻辑。

验收：
- 测试：在子目录执行 `install` 仍能找到正确的 `spm.json` 并输出到 `<package root>/.spm/`。

### 2）Installer 硬化：`deps/` 嵌套布局 + 冲突策略

目标：安装稳定、不覆写别人目录，为多版本留结构空间。

任务：
- 安装时强制校验：`SKILL.md` 有 frontmatter，且 `name == 目录名`。
- 同一个父 skill 的 `deps/` 下出现同名 `skillName`（不同版本/不同来源）直接报错（MVP）。
- `store` 缓存与 `skills` 安装解耦：重复安装不重复解包/复制。

验收：
- 测试：同一父 skill 同时要求两个版本的同名 skill => 报错且错误信息清晰。

### 3）Lockfile 规范化：可复现安装

目标：`spm install` 默认严格遵循 lockfile。

任务：
- 定稿 `.spm/spm-lock.json` schema：`root` / `packages` / `resolved` / `integrity` / `dependencies`（尽量贴近 npm）。
- 有 lockfile 时不重新选版本（除非 `--update`）。
- `integrity`：对 tarball 计算 `sha256` 并写入 lockfile；install 时校验。

验收：
- 测试：registry 的 `latest` 指向新版本后，再 `install` 仍安装 lockfile 固定版本。

---

## P1（近期）

### 4）依赖解析：semver/range 覆盖

目标：覆盖常用 npm 风格范围表达。

任务：
- 支持 `*`、组合比较符（`>= <`）、`^`、`~`（扩展当前子集）。
- 明确：只有 `range=latest` 才使用 dist-tag，其它一律按 semver 选最高满足版本。

验收：
- 测试：range 解析与 `maxSatisfying()` 行为覆盖常见组合。

### 5）`spm init` 模板与 spec 对齐

目标：生成的 skill 目录按官方 spec 100% 可用。

任务：
- 更完善的 `SKILL.md` skeleton（Instructions / Examples / Edge cases）。
- 推荐命名约定：`@scope/<skillName>`，并校验末段 `<skillName>` 与 `spm.json.skillName` 一致。

验收：
- 测试：`init` 生成的 `SKILL.md` 可以通过 `ensureSkillValid()`。

### 6）CLI 体验（更像 npm）

目标：参数/报错/输出更一致。

任务：
- `--registry` 支持默认值（配置文件/环境变量）+ 显式覆盖。
- `spm list --tree` 树形输出。
- CLI 测试：直接调用 `runCli()` 做纯进程内测试（不 spawn）。

---

## P2（中期：远端 registry）

### 7）Registry 抽象 + HTTP Registry（参考 npm）

目标：远端注册服务 + 本地缓存机制。

任务：
- 定义 `Registry` 接口：`resolve` / `fetchTarball` / `publish` / `getIndex`。
- 保留 `fileRegistry` 作为离线/缓存实现。
- 新增 `httpRegistry`（npm 风格）：
  - `GET /<pkg>` 返回 index
  - `GET /<pkg>/-/<file>.tgz` 返回 tarball

验收：
- 集成测试：用 Node `http` 在同进程启动 server（不 spawn）。

### 8）Store 缓存去重（内容寻址方向）

目标：避免重复下载/解包。

任务：
- 用 `integrity` 作为 cache key。
- 命中时直接跳过解包/复制，并可选输出 debug 统计。

---

## P3（长期：宿主集成 / 多版本）

### 9）宿主解析契约（opencode/codex）

目标：让 `.spm/skills/<entry>/deps/...` 在运行时真正可用。

任务：
- 明确宿主 skill 发现/解析规则：是否递归发现、是否支持“就近 deps”解析。
- 若宿主不支持：两条路二选一
  - 改宿主：实现就近 `deps/` 解析（优先）
  - 或改 SPM：提供 flatten view（有覆写/冲突风险，需要策略）

### 10）供应链安全（参考 npm 的教训）

目标：默认安全。

任务：
- 保持默认：绝不自动执行 `scripts/`。
- 后续可选：发布签名（签名文件 + 信任公钥）。

---

## 已完成（v0.1 起步）

- 设计文档：`SPM_DESIGN.md`
- CLI 骨架：`src/cli.js`, `src/cli/runCli.js`
- 核心库：`frontmatter`, `skillSpec`, `semver`, `fileRegistry`, `installer`, `lockfile`
- 纯 JS 打包/解包：`src/lib/tgz.js`, `src/lib/tarFormat.js`（沙箱下不依赖 spawn）
- 测试：`test/*.test.js` + `npm test`
