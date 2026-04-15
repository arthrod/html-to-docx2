## 2025-04-15 - Optimize buildRunProperties by removing cloneDeep
**Learning:** The buildRunProperties function unnecessarily cloned the attributes object via cloneDeep on every run, even though it did not mutate it. Additionally, Object.keys().forEach incurs unnecessary redundant obj[key] lookups.
**Action:** Remove cloneDeep from buildRunProperties call sites, and replace Object.keys().forEach with a for...of loop using Object.entries() on hot paths.
