## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## 2024-05-25 - Image Dimension Synthetics
**Learning:** For testing parsers on binary image data, you do NOT need real or large image files. Creating a synthetic array of exact hex values for headers and skipping logic chunks (like SOF0, VP8L, etc.) runs tests in less than a millisecond with zero IO flakiness.
**Action:** Use exactly matched synthetic Uint8Arrays for any binary parsing utilities, instead of mocking fs reads or passing in massive bloated mock files.
