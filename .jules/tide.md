## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.
## 2024-06-11 - Synthetic Binary Header Tests for Parsers
**Learning:** Testing binary parsers like `getImageDimensions` without external fixtures requires meticulously crafting valid header blocks (e.g., JPEG's `SOF0` marker or WebP's `VP8` chunk). Generating these exact byte sequences in memory avoids network latency and file system dependencies while validating bitwise logic perfectly.
**Action:** When testing binary utility functions, prefer synthetically creating minimal valid `Uint8Array` payloads in the test file over fetching or saving real image assets to the repository, as it guarantees isolation, speed, and prevents disk I/O flakiness.
