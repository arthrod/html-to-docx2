## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## 2025-02-28 - Test URL fallback logic
**Learning:** URL fallback paths for malformed URLs and paths with query parameters/hashes can silently fail or skip coverage without specific unit test cases.
**Action:** Always write explicit test cases that pass non-URL-parsable strings to ensure fallback catch blocks (like string manipulation of queries/hashes) behave as expected.
