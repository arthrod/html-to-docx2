
## 2024-03-25 - Prevent scratchpad pollution when profiling
**Learning:** Adding test-perf.ts scripts and bun.lock changes by running `bun install` causes failures in review.
**Action:** Limit commits to the modified source files only and remove scratchpad files. Avoid side-effects like bun.lock mutations if no dependencies are intended to change.
