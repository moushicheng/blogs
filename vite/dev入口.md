vite 分为前端和后台服务两个部分
package
-vite
-src
-client
-server

1. 当你输入 vite 会发送什么？
   vite 会执行 node_module/.bin/vite.CMD

```bash
@SETLOCAL
@IF NOT DEFINED NODE_PATH (
  @SET "NODE_PATH=E:\work_space\Technology_related\Front-end\MVVM\vue\vite\vite-main\node_modules\.pnpm\node_modules"
) ELSE (
  @SET "NODE_PATH=%NODE_PATH%;E:\work_space\Technology_related\Front-end\MVVM\vue\vite\vite-main\node_modules\.pnpm\node_modules"
)
@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\..\vite\bin\vite.js" %*
) ELSE (
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\..\vite\bin\vite.js" %*
)
```

它会去运行命令 node ..\vite\bin\vite.js
其中的核心源码就是这个

```javascript
function start() {
  return import('../dist/node/cli.js')
}
```

然后 cli.js，除了处理 cli 的逻辑之外它还启动了后台服务

```javascript
const { createServer } = await import('./chunks/dep-6b2ac8fa.js').then(
  function (n) {
    return n.A
  }
)
const server = await createServer({
  root,
  base: options.base,
  mode: options.mode,
  configFile: options.config,
  logLevel: options.logLevel,
  clearScreen: options.clearScreen,
  optimizeDeps: { force: options.force },
  server: cleanOptions(options)
})

await server.listen()

server.printUrls()
```

之后就走到了创建Server的流程
createServer分别作了这几件事
1. 解析用户/默认配置
2. 创建网络服务
 - http ，并在其上注册各种中间件
 - ws
3. 利用网络服务，做文件监控(此处和HMR相关)
4. 创建插件容器 pluginContainer ，处理Plugin Hook

