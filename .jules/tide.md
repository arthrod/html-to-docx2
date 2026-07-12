## 2024-05-24 - Unit Conversion Pure Functions

**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## YYYY-MM-DD - Binary Format Edge Cases in Tests
**Learning:** When writing tests for binary parser fallbacks (like malformed JPEGs where SOF markers are shifted by padding), you must deeply understand the target parser's specific logic and state management. Creating fixtures that look visually valid might still cause parser loop regressions (e.g. failing to account for `offset += 2 + length` mutating state when jumping segments). Minimal valid fixtures using `DataView` are best to ensure exact binary structures.
**Action:** When adding coverage for parsing arrays/buffers, synthesize exact hexadecimal boundaries matching the parser's specific byte loops, and always include targeted tests for missing or padded chunks.
