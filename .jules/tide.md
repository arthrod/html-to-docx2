## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.
## 2024-05-24 - Exhaustive Pure Function Testing
**Learning:** Even though pure mathematical functions (like inverse unit conversions) are inherently safe, leaving them untested can mask subtle bugs, especially when rounding errors might compound in a chain of unit conversions (e.g., pixel to point via HIP).
**Action:** When testing pure utilities, aim for exhaustive coverage of all exposed functions, not just the primary path, because edge cases or omissions in the inverse operations can silently fail when integrated into larger layout engines.
