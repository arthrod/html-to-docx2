## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## 2026-07-05 - ArrayBuffer Support in Image Dimensions
**Learning:** `getImageDimensions` in `src/utils/image-dimensions.ts` expects an `ArrayBuffer` or `Uint8Array`. Testing pure binary parsers requires constructing precise `Uint8Array` byte arrays with correct segment offsets to verify normal operations, skip logic, and malformed fallback behaviors without needing actual image files or network mocking.
**Action:** Always construct targeted `Uint8Array` byte arrays (e.g., using `set()` at specific offsets) to test binary format parsers. Ensure edge cases like malformed headers and segment skipping are tested to maximize branch coverage.
