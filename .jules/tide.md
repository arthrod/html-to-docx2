## 2024-05-24 - Unit Conversion Pure Functions

**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## $(date +%Y-%m-%d) - Floating-point Math in Unit Conversions

**Learning:** Pure functions that handle unit conversions (like `cmToInch` and pixel-to-EMU) can yield long float values when dealing with precision factors like `0.3937008`. Writing assertions with `toBe()` on floats will fail due to precision mismatch; always use `toBeCloseTo(expected, numDigits)` for float assertions to prevent brittle tests.
**Action:** Always prefer testing against exact integer conversions (e.g. 72 points to 96 pixels) where possible. For float conversions, enforce the use of `toBeCloseTo()` to prevent false negatives across different Javascript engines.
