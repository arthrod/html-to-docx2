
## 2025-02-14 - Using for...in without Object.hasOwn
**Learning:** When attempting to avoid array allocation overhead from `Object.keys()` by swapping it with `for...in` in a hot loop (like traversing parsed element attributes), omitting a hasOwnProperty check (like `Object.hasOwn(obj, key)`) creates a bug risk by iterating over prototype chains.
**Action:** When converting `Object.keys(obj).forEach` or `for (const key of Object.keys(obj))` to `for...in`, always include `if (Object.hasOwn(obj, key))` or `if (obj.hasOwnProperty(key))` to guarantee the same runtime behavior while still capturing the performance and memory wins.
