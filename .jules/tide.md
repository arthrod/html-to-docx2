## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## 2025-06-10 - Using Memory for Faked Constants
**Learning:** The test suite `image-dimensions.test.js` uses utility functions (like `createMinimalJPEG`) to spoof minimal image headers for unit testing memory allocations, completely negating the need for fetching or holding large fixtures, achieving fast isolated execution without flakiness.
**Action:** When testing dimension parsing utilities, prefer synthetically creating minimal binary header mocks in memory over fetching entire image fixtures from the file system.
