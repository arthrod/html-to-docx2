## 2024-05-24 - Unit Conversion Pure Functions

**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## 2025-02-28 - Testing Pure Functions

**Learning:** Pure functions like color conversions can be tested with full branch coverage natively without mocks, providing 100% reliability for mapping HTML formats to DOCX formats.
**Action:** Always favor writing simple input/output tests for utility/conversion files as they are extremely fast and completely stateless.

## 2025-02-28 - Testing Pure Functions
**Learning:** Pure functions like color conversions can be tested with full branch coverage natively without mocks, providing 100% reliability for mapping HTML formats to DOCX formats.
**Action:** Always favor writing simple input/output tests for utility/conversion files as they are extremely fast and completely stateless.
