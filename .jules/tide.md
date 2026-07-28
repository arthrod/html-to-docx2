## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.

## 2024-05-25 - Integer Encoding SSRF Evasion
**Learning:** URL validation functions (like `isPrivateOrLocalHost`) often fail to account for alternate IP address encodings. Attackers can bypass naive string-matching checks (`=== '127.0.0.1'`) by using integer string representations (e.g., `2130706433` for `127.0.0.1`), hex (`0x7F000001`), or octal formats to achieve Server-Side Request Forgery (SSRF). Additionally, JavaScript bitwise operations (`>>> 24`) will successfully parse negative signed integer string representations (e.g., `-1062731519` for `192.168.1.1`).
**Action:** When testing IP address validation logic, always include test cases for integer (unsigned and signed), hexadecimal, and octal string representations of localhost and private network ranges to ensure the underlying parser correctly normalizes and restricts them.
