# SharedArrayBuffer 兼容性说明（小程序环境）

结论：
- 项目源代码未直接使用 SharedArrayBuffer；警告来源于 node_modules 与类型定义的声明检测。
- 微信小程序不支持设置跨域隔离头（COOP/COEP），无法按 Web H5 的方式消除浏览器警告，但不影响小程序运行。

处理策略：
- 保持不使用依赖 SharedArrayBuffer 的前端能力；不在业务代码中访问 window/ globalThis.SharedArrayBuffer。
- 保持三方库默认配置（当前未触发 SAB 运行路径）。
- 若未来发布 H5 版本，则在服务端配置：
  - Cross-Origin-Opener-Policy: same-origin
  - Cross-Origin-Embedder-Policy: require-corp
  并替换不兼容资源为同源/带CORP头资源。

验证：
- 代码检索仅在 node_modules 与文档中发现 SAB 字样，业务代码为 0 处。
- 无需对小程序代码做额外改动即可规避运行期问题。