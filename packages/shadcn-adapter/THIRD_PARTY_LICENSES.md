# Third-Party Licenses — @future-ui/shadcn-adapter

本归档包含 vendored 的 shadcn/ui 组件源码（不可变冻结副本，见
`src/upstream-provenance.ts` 的按文件 SHA-256/git blob 指纹）。按上游许可要求，
以下保留相应版权与许可声明。冻结的 vendored 源文件本身不作任何修改。

## shadcn/ui (vendored components: dialog, button, input)

- 上游仓库：https://github.com/shadcn-ui/ui
- 冻结 commit：`7ff7dbf8669fa3392c294ee745dc8d8c3cee842c`（2026-10-06）
- 许可证：MIT（文件：`LICENSE.md` @ 上述 commit）

> MIT License
>
> Copyright (c) 2023 shadcn
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

## Direct runtime dependencies (not vendored; pinned exact versions)

以下依赖以声明依赖形式引用，由离仓宿主安装，其许可证如下
（与 `src/upstream-provenance.ts` 的 `runtimeDependencies` 一致）：

| Package | Version | License |
| --- | --- | --- |
| radix-ui | 1.7.0 | MIT |
| cn | 0.4.0 | MIT |
| class-variance-authority | 0.7.1 | Apache-2.0 |
| lucide-react | 1.52.0 | ISC |

各依赖的完整许可文本以其发布包内的 LICENSE 文件为准。
