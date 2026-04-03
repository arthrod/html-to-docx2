## 2025-04-03 - [Optimize VDOM attributes parsing path]
**Learning:** In highly recursive functions like HTML-to-VDOM tag parsing, `Object.keys().forEach()` creates a measurable array allocation and GC penalty overhead, even when the object is small, because the V8 engine has to allocate a new Array object for every single HTML element encountered.
**Action:** Prefer `for...in` loops with an `hasOwnProperty` check when looping over element attributes in high-frequency string/AST parsing paths to strictly eliminate intermediate memory allocations.
