## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.
## 2024-06-21 - Image Binary Header Synthetic Mocks
**Learning:** For utilities that parse binary byte streams (like `getImageDimensions`), generating synthetically perfect minimal mock files in memory via `Uint8Array` and `DataView` is far superior to saving raw image fixtures. It eliminates I/O overhead, reduces repo bloat, and provides granular control over byte-specific assertions (like testing lossy WebP formats or malformed headers directly).
**Action:** When testing binary parsers, always reverse-engineer the minimum byte sequence required to hit branches rather than relying on full external file fixtures.
