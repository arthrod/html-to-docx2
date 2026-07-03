## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## 2026-07-03 - Binary Parsing Testing & Mocks
**Learning:** Testing dimension parsers using minimal mock headers (e.g., BMP, JPEG, WebP) requires strict adherence to binary specification bounds. For example, testing  `getImageDimensions` for BMP requires a 54-byte `BITMAPINFOHEADER` structure (not the smaller 26-byte `BITMAPCOREHEADER`) since the parser correctly expects 32-bit width/height fields at offsets 18 and 22. Similarly, JPEG parsers must account for padding bytes (non-0xFF values between segments), which requires crafting mock buffers that test skipping these bytes properly.
**Action:** When mocking raw binary fixtures, ensure that format-specific blocks (such as SOF0/1/2 in JPEG or VP8 in WebP) are explicitly built with padding and exact offset expectations mirroring real-world edge cases.
