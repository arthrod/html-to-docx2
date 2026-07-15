## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## 2024-07-15 - image-dimensions.test.js
**Learning:** `getImageDimensions` operates on pure byte arrays without requiring mocking. We can test malformed structures (missing SOF marker in JPEG, missing VP8 chunk in WebP, non-marker byte padding between JPEG segments) using hardcoded `Uint8Array` fragments. The SOF length in JPEG is simply the length field, so the next marker offset is `current_offset + 2 + length`.
**Action:** When adding coverage for pure utility functions, directly instantiate `Uint8Array`s with exactly the specific headers/chunks that trigger the fallback conditions in the parser, rather than attempting to mock file parsers or fetch real files.
