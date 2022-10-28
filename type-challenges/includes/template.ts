import { Equal } from "@type-challenges/utils";

export type Includes<T extends readonly any[], U> = T extends [infer X, ...infer Rest]
  ? Equal<X, U> extends true
    ? true
    : Includes<Rest, U>
  : false;
