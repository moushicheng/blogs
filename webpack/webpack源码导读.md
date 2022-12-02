

本文介绍了笔者阅读webpack的相关心得和方法论，如果你是刚开始想要了解webpack源码流程的萌新，这篇文章一定会很有用。

# 写在前面

对于webpack很多人第一个疑惑可能是，为什么要读源码？

诚然，很多人会这样想，webpack作为一个打包工具，我们直接“用”不就行了，但这也意味着这几点

1.  在webpack方面技术水平永远停留在了配置webpack.config.js。
2.  webpack永远都是一个黑盒，不知道具体运行，当遇到具体工程问题可能无从下手。
3.  无法编写webpack插件，因为要理解webpack插件的运行，就必须得对webpack的基本运行流程有所了解。
4.  现代前端的生态和webpack这类打包工具高度相关，理解webpack也能逐渐了解前端的生态圈。

基于这几点，笔者强烈建议作为前端工程师如果你想进阶高阶，就得好好了解一下webpack的底层流程。

# 调试指南

## 构建你的调试仓库

1. 克隆webpack源码仓库如下↓，并记得npm install好依赖。

   ![image-20221130101433235](C:\Users\moush\AppData\Roaming\Typora\typora-user-images\image-20221130101433235.png)

2. 然后，创建playgrounds文件夹，用于存放调试的demo

3. 在demo中创建你想要调试的webpack工程

   比如一个最基础的helloworld工程:

   ![image-20221130101756997](C:\Users\moush\AppData\Roaming\Typora\typora-user-images\image-20221130101756997.png)

   ```javascript
   // src/helloWorld
   module.exports={
   	show:()=>{
   		console.log('hello,world');
   	}
   }
   
   
   // index.js
   import {show} from '@/helloWorld'
   show();
   
   
   // build.js
   const webpack = require("../../lib/webpack.js");
   const config = require("./webpack.config.js");
   
   const compiler = webpack(config);
   
   compiler.run((err, stats) => {
   	if (err) throw err;
   	console.log("已打包好了，我们做点别的事...");
   });
   
   
   // webpack.config.js
   const path = require("path");
   module.exports = {
   	entry: './index.js',
   	output: {
   		path: path.resolve(__dirname, "build"),
   		filename: "[name].bundle.js",
   	},
   	resolve:{
       alias:{
   			'@':  './src'
   		}
   	},
   	mode: 'development',
   }
   ```

   ## 开始调试 

   vscode选中JavaScript调试终端

   ![image-20221130103842393](C:\Users\moush\AppData\Roaming\Typora\typora-user-images\image-20221130103842393.png)

   然后进入playgrounds中你要调试的目录，

   输入node build.js，即可开始感受webpack的世界~

# webpack基础架构
## Tapable浅析

webpack的世界是由一堆hooks构成的，hooks是什么？一切都源于tapable这个库，我们先来个最浅显的理解

如下:↓

```js
const { SyncHook } = require('tapable');

const hook = new SyncHook(['count']);

hook.tap({
	name: 'x',
}, (count) => {
	console.log('x done',count);
});
hook.tap({
	name: 'y',
}, (count) => {
	console.log('y done',count);
});
hook.tap({
	name: 'z'
}, (count) => {
	console.log('z done & show result',count);
});
hook.call(5);
//x done 5
//y done 5
//z done & show result 5


```

首先，我们可以注册一个同步顺序执行的SyncHook，我们可以在它身上再继续注册方法

```js
const hook = new SyncHook(['count']);
```

注册方法x，y，z，他首先接受一个name，实际上这个name并无什么意义取什么都行，然后第二个参数得是一个callback，用于之后在call hook的时候执行

```javascript
hook.tap({
	name: 'x',
}, (count) => {
	console.log('x done');
});
hook.tap({
	name: 'y',
}, (count) => {
	console.log('y done');
});
hook.tap({
	name: 'z'
}, (count) => {
	console.log('z done & show result');
});
```

最后，触发钩子,并传递参数。

更具体的内容可以看这篇[Webpack 核心库 Tapable 的使用与原理解析](https://zhuanlan.zhihu.com/p/100974318)



## Tapable在webpack的插件应用

我们都知道webpack有一套强大的插件机制，了解插件的写法，其实就可以了解到tapable在webpack的实际应用，进而了解到webpack的基础架构。

webpack 插件由以下组成：

- 一个 JavaScript 命名函数或 JavaScript 类。
- 在插件函数的 prototype 上定义一个 `apply` 方法。
- 指定一个绑定到 webpack 自身hook的[事件钩子](https://www.webpackjs.com/api/compiler-hooks/)。
- 处理 webpack 内部实例的特定数据。
- 功能完成后调用 webpack 提供的回调。

上面废话比较多，不过出自官方文档，下面举个简单的例子：

```javascript
class myPlugin {
    apply(compiler) {
    }
}
```

举个实例：

webpack有个内置插件BannerPlugin，它的功能非常简单，可以在chunks的开头或者结尾增加一串用户指定的字符串，下面出现的assets，compilation，complier等等概念后续会做一个简略的简述

```javascript
class BannerPlugin {	
	apply(compiler) {
		compiler.hooks.compilation.tap("BannerPlugin", compilation => {
			compilation.hooks.processAssets.tap(
				{
					name: "BannerPlugin",
					stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
				},
				() => {
                  //...省略
                  for (const file of chunk.files) {
                    //利用updateAsset更新资产
					compilation.updateAsset(file, old => {
						const source = options.footer //根据配置项将comment置顶或者置底
							? new ConcatSource(old, "\n", comment) //concatSource可以拼接源码
							: new ConcatSource(comment, "\n", old);
						return source;
					});
                  }
				}
			);
		});
	}
}
```

BannerPlugin插件就是在compilation上定义的processAssets钩子上注册了事件，而processAssets事件我们可以全局搜索一下，发现在cout中执行

![image-20221201162400733](C:\Users\moush\AppData\Roaming\Typora\typora-user-images\image-20221201162400733.png)

而cout在createChunkAssets函数调用完执行，这时候我们就可以拿到资产文件了。

![image-20221201162438565](C:\Users\moush\AppData\Roaming\Typora\typora-user-images\image-20221201162438565.png)

对上面一些概念做个基本简述：

- assets：资产文件，是webpack资源流转的最后一个形态，管理了具体的chunks输出代码，以及输出方式等。

- [Compiler](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fapi%2Fcompiler-hooks%2F)：全局构建管理器，Webpack 启动后会首先创建 `compiler` 对象，负责管理配置信息、Loader、Plugin 等。

- [Compilation](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fapi%2Fcompilation-hooks%2F)：单次构建过程的管理器，负责遍历模块，执行编译操作，

## 再分析两个读webpack hook的小技巧

- 搜索hooks

  在webpack中，如果你想搜索一个hooks

  直接全局搜索hooks.hookname 就可以搜到具体的hook，如上文hooks.processAssets的搜索方式

- 快速读懂一个hooks

  用这个技巧，你甚至不用管hooks是什么类型的hooks，也能一并了解hooks的运行逻辑。

  其实很简单，比如你遇到hooks.make这个钩子，

  ![image-20221201163409625](C:\Users\moush\AppData\Roaming\Typora\typora-user-images\image-20221201163409625.png)

  不用管他是什么情况，直接点击单步调试，进去之后，点击单步跳过，到this.callAsync

  ![image-20221201163449387](C:\Users\moush\AppData\Roaming\Typora\typora-user-images\image-20221201163449387.png)

  然后会进到一个匿名函数

  ![image-20221201163532309](C:\Users\moush\AppData\Roaming\Typora\typora-user-images\image-20221201163532309.png)

  该函数就是这个hooks的具体逻辑，它是tapable动态生成的。

# 最后唠叨几句

1. 因为webpack的流程及其复杂且繁多，一定要有做流程图的习惯。

   这是笔者做的流程图的一部分（可能比较不符合规范哈，毕竟是做给自己看的。

![image-20221201164203526](C:\Users\moush\AppData\Roaming\Typora\typora-user-images\image-20221201164203526.png)

2. 要有记笔记的习惯，记笔记不只是为了日后复习，其实也是在读源码的过程中辅助思考的工具，记笔记的时候你可以在笔记上自己提问自己几个问题，

   比如读到make阶段时，你可以问：模块是怎么生成的？辅助模块生成的factory是什么？factory如何生成模块？处理数据？等等，然后以解决一个个问题的方式读源码，会目标明确很多 。

   当然，你提问自己问题的前提是要先浅览一遍某个模块的流程，然后通过函数名，变量名的抽象猜测作者是想做什么，这个过程比较玄学，总之加油。

