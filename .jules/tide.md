## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## 2026-07-24 - CI Submodule Failures
**Learning:** If GitHub Actions (`actions/checkout`) fails with `fatal: No url found for submodule path...`, it means there are orphaned `160000` mode Git link entries in the index but no `.gitmodules` file configuring them.
**Action:** Use `git rm --cached <submodule-path>` to remove the broken submodules from the index instead of adding generic `--ignore-scripts` fixes that don't address the root checkout failure.
