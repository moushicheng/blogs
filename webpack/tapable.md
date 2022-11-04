第一个逻辑块:
tap&&call

## tap

tap 核心逻辑在于 insert,
他会按 Stage 顺序，逐次插入到 taps 队列中,taps 中 stage 越高则下标越小（越靠前

```javascript
while (i > 0) {
  i--;
  const x = this.taps[i];
  this.taps[i + 1] = x;
  const xStage = x.stage || 0;
  if (before) {
    if (before.has(x.name)) {
      before.delete(x.name);
      continue;
    }
    if (before.size > 0) {
      continue;
    }
  }
  if (xStage > stage) {
    continue;
  }
  i++;
  break;
}
this.taps[i] = item;
```

## call

入口逻辑

```javascript
const CALL_DELEGATE = function (...args) {
  this.call = this._createCall("sync");
  return this.call(...args);
};
```

首先是 createCall，该函数创建一个能按次序执行所有同步回调的 Function

```javascript
//该函数可以按次序执行所有fn
fn = new Function(
  this.args(),
  '"use strict";\n' +
    this.header() +
    this.contentWithInterceptors({
      onError: (err) => `throw ${err};\n`,
      onResult: (result) => `return ${result};\n`,
      resultReturns: true,
      onDone: () => "",
      rethrowIfPossible: true,
    })
);
return fn;
```

然后执行 this.call 并传入用户给定的参数。
看一组快照,对于 tap 三次的 call

```javascript
const hook = new SyncHook(["param1", "param2"]); // 创建钩子对象
hook.tap("event1", (param) => console.log("event1:", param));
hook.tap("event2", (param) => console.log("event2:", param));
hook.tap("event3", (param, param2) => console.log("event3:", param, param2));

hook.call("hello", "world");
```

产生的函数截图如下

```javascript
function (param1,params2){
    "use strict";
    var _context;
    var _x = this._x;
    var _fn0 = _x[0];
    _fn0(param1, param2);
    var _fn1 = _x[1];
    _fn1(param1, param2);
    var _fn2 = _x[2];
    _fn2(param1, param2);
}
```

## tapAsync && callAsync
先看模板
```js
const hook = new AsyncSeriesHook(['arg1', 'arg2']);

console.time('timer');

// 注册事件
hook.tapAsync('flag1', (arg1, arg2, callback) => {
  console.log('flag1:', arg1, arg2);
  setTimeout(() => {
    // 1s后调用callback表示 flag1执行完成
    callback(null, 'flag1');
  }, 2000);
});

hook.tapAsync('flag2', (arg1, arg2, callback) => {
  console.log('flag2:', arg1, arg2);
  setTimeout(() => {
    // 1s后调用callback表示 flag1执行完成
    callback(null, 'flag2');
  }, 2000);
});


// 调用事件并传递执行参数
hook.callAsync('1', '2', (err, result) => {
  if (err) {
    console.log('出错了，原因: ' + err);
  }
  console.log('成功,结果: ', result);
  console.timeEnd('timer');
});

```
对于callAsync，看生成函数，是递归式的执行的，tap如果cb传递第一个参数，则会被视为error，直接返回，如果不是则执行_next0
```javascript
(function anonymous(arg1, arg2, _callback
) {
    "use strict";
    var _context;
    var _x = this._x;
    function _next0() {
        var _fn1 = _x[1];
        _fn1(arg1, arg2, (function (_err1) {
            if (_err1) {
                _callback(_err1);
            } else {
                _callback();
            }
        }));
    }
    var _fn0 = _x[0];
    _fn0(arg1, arg2, (function (_err0) {
        if (_err0) {
            _callback(_err0);
        } else {
            _next0();
        }
    }));

})
```