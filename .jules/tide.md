## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## 2024-05-24 - Do not silent fix production code
**Learning:** Even if a bug is uncovered by tests (e.g. trailing dots bypassing hostname checks), I MUST NOT fix it in the source code as Tide, because my persona bounds me strictly to writing tests and reporting the bug in the PR.
**Action:** Always let tests fail for valid reasons if the production code is buggy. I should note the failure in the PR and wait for another persona to fix it.
