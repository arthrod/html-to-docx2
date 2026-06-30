## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.
## 2024-06-30 - Image Dimensions Pure Functions

**Learning:** Testing pure functions like `getImageDimensions` in `src/utils/image-dimensions.ts` requires synthetically mocking binary data structures (like JPEG, BMP, and WebP headers) rather than actual file mocking. This offers excellent insight into how parsing operates on different chunk headers and format signatures.

**Action:** When adding missing coverage for binary image dimensions, use minimal constructed `Uint8Array` binary headers representing edge cases (missing VP8 chunk in WebP, missing SOF chunk in JPEG, non-marker bytes between JPEG segments, etc).
