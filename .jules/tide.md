## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.
## $(date +%Y-%m-%d) - Synthetic Binary Test Fixtures for Parsers
**Learning:** Testing binary parsers (like `getImageDimensions`) is exponentially faster and less brittle when synthetically constructing exact `Uint8Array` byte headers in memory, rather than mocking a `fs` layer or maintaining raw binary file fixtures in the repo.
**Action:** Always favor manually crafting format-specific binary signatures (e.g., JPEG's `FF D8 FF`, WebP's `VP8L` chunk, BMP's 40-byte info header) at precise byte offsets to achieve robust unit tests without network or file-system overhead.
