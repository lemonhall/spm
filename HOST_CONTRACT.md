# SPM 与宿主（opencode/codex）解析契约

SPM 采用类似 npm 的嵌套依赖布局：

```
.spm/skills/<entry-skill>/
  SKILL.md
  deps/
    <dep-skill>/
      SKILL.md
      deps/
        <dep-of-dep>/
          SKILL.md
```

这样做的目的：

- 避免“平铺安装”导致覆写其他技能目录
- 为同一项目内多版本并存预留结构空间（类似 node_modules）

## 宿主需要支持的解析规则（关键）

当某个 skill（目录 A）在运行时引用 skill `X`（通过 skill name）时，宿主需要按以下顺序解析：

1. 先在 `A/deps/<X>/` 查找
2. 找不到就向上一级 skill 目录回溯，继续查 `../deps/<X>/`
3. 一直回溯到 entry skill（或搜索根）为止

这等价于 Node.js 的模块解析“就近优先”策略。

## 如果宿主不支持怎么办

SPM 提供一个降级方案：把嵌套依赖导出为平铺目录（会丢失多版本能力）。

- `spm export --out <dir>`：导出一个“flat skills 目录”
- 若发现同名 skillName 但版本/包不同，则导出直接报错（避免隐式覆写）

## 结论

- 想要“同一项目多版本并存”，宿主必须实现上述就近解析
- 宿主未实现前，SPM 仍可用，但只能在导出/平铺后使用（且可能有冲突）

