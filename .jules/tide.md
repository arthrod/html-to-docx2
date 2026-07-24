## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## 2026-07-24 - CI Dependencies Fix
**Learning:** `bun install --ignore-scripts` should not be used in CI if the project relies on specific binary hooks that may be needed post-install. We need to identify what script is causing the submodule `git` issue.
**Action:** Let's look closer at the `git submodule` error.
