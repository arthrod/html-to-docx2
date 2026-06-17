## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.
## 2025-02-28 - Testing try/catch logic internally throwing
**Learning:** Testing error paths like the ones triggering native `new URL()` exceptions is essential because the exception itself happens deeply internally, and without it, the function returns unexpected runtime failures rather than safely returning `false`. Testing malformed string cases explicitly ensures the `catch` block is covered.
**Action:** When a function's primary safety mechanism is wrapping a native API call in a try/catch, explicitly write a test case sending known unparseable input to trigger the `catch` block to guarantee robust fallback logic.
