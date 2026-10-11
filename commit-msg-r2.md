R3-WIN-02 (#108 / PR #111 第二轮复审): 复合导入漏检 + 字符串伪属性误判 + .gitignore 生成覆盖

- P2-02 复合导入: parseImports 增 mixed-namespace 正则（import Def, * as Root from 'x'），
  负例: 复合导入根入口 → ai:doctor 退出码 1 browser-import diagnose
- P2-03 字符串伪属性: countPropInElement 重写为 token 级扫描——跳过字符串/模板/注释/
  JSX 表达式，属性名需独立词边界且排除 -/. 前缀; 负例: description="onSave=NOT_REAL"
  不误判，check 退出码 0
- P3 .gitignore: cli.ts GITIGNORE_CONTENT 补 ai/artifacts/（与模板同步，生成工程实测含规则）
- 回归: cli.test 新增复合导入 + 字符串伪属性用例（32 passed）; lint/typecheck 0
- CLI 归档 SHA 更新 EC7276E7…

Refs #108
