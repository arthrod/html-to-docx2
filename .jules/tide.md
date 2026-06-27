## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.
## YYYY-MM-DD - BMP Test Header Mismatch
**Learning:** The BMP mock used a 12-byte BITMAPCOREHEADER, but the code parses a 40-byte BITMAPINFOHEADER.
**Action:** Use 40-byte BITMAPINFOHEADER headers in BMP tests to ensure accurate offset parsing.
