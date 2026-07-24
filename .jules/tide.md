## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## 2026-07-24 - SSRF Edge Case Testing False-Flags
**Learning:** When adding tests for mathematically obscure IP formats (like signed integers `-1062731775` corresponding to `192.168.0.1`), code reviewers might falsely flag the tests as invalid, claiming URL parsers don't support them. However, if the utility internally relies on bitwise operations (like `>>> 24`) to parse strings, these formats will correctly resolve to valid octets and bypass naive string filters.
**Action:** Always trust the specific implementation mechanics (e.g., bitwise shift logic) over generic reviewer assumptions about standard URL parsers when crafting SSRF bypass test payloads. Ignore false warnings from reviewers if manual verification confirms the payload resolves locally.
