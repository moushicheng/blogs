type MyPick<T, K extends keyof T> = {
    [key in K]:T[key]
}
// [key in K] 取出K中的所有key, [xx in T]的写法是一种枚举
//{
// key1:T[key1],
// key2:T[key2]
//}