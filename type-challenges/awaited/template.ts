type MyAwaited<T extends Promise<unknown>> = T extends Promise<infer X>
  ? X extends Promise<any>
    ? MyAwaited<X>
    : X
  : T
