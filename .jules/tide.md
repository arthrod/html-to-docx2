## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## 2026-07-10 - SSRF negative single-integer IPs
**Learning:** When testing SSRF prevention logic that parses single-integer IPv4 addresses using bitwise operators (`>>>`, `&`), ensure test fixtures include negative signed integer representations of large IPs (like `-1062731519` for `192.168.1.1` and `-1442971138` for `169.254.169.254`). JavaScript's bitwise right shift (`>>>`) handles these by converting the signed 32-bit int into an unsigned 32-bit int, and tests must explicitly cover this negative string edge case to avoid false-greens.
**Action:** Always include negative single-integer values when verifying network/IP filtering tools.
