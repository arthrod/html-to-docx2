## 2026-04-03 - Optimize object iteration in xml-builder
**Learning:** Calling cloneDeep inside hot paths for configuration objects before iterating with Object.keys() incurs massive memory allocation and performance overhead in TS/JS.
**Action:** Replace cloneDeep and Object.keys().forEach() with direct for...of Object.entries() iteration where mutability of the original configuration is not required.
