## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.
## 2025-05-14 - Testing Module-Level Global State
**Learning:** When testing functions that rely on module-level global variables (like `listNumberingByLevel` in `render-document-file.ts`), it is crucial to use `beforeEach` with a reset function to ensure test isolation.
**Action:** Always check for side effects and global state when writing unit tests for utility functions that don't accept all necessary state as arguments.
