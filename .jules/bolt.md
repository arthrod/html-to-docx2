## 2025-03-01 - Avoid premature regex refactoring
**Learning:** In Bun/V8, combining `regex.test(str)` and `str.match(regex)` into a single inline assignment `if ((match = str.match(regex)))` is not always faster. Benchmarking showed it improved complex color parsing by ~25% but *degraded* simple unit parsing by ~15-25%.
**Action:** Always benchmark regex assignments before applying. Prefer simple `test()` followed by `match()` for short/simple regexes, but consider inline assignments for complex/expensive regexes.

## 2025-03-01 - Prevent redundant memory allocation in static object iteration
**Learning:** Using `cloneDeep()` on a static configuration object (e.g., `paragraphBordersObject`) in a hot path, combined with `Object.keys().forEach`, creates significant memory allocations and redundant lookups.
**Action:** Use `Object.entries()` with a `for...of` loop to iterate directly over the static object, avoiding O(N) array allocation, redundant key lookups, and deep cloning entirely. This yielded a ~90% performance improvement in benchmarks.
