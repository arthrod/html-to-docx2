## 2024-05-24 - Unit Conversion Pure Functions
**Learning:** Pure functions like the unit conversion utilities in `src/utils/unit-conversion.ts` are ideal for Tier 1 testing. They require zero mocking, run extremely fast, and are fundamental for preventing downstream regressions in complex calculations (like line heights or image dimensions).
**Action:** Always prioritize finding and testing pure, math-heavy utilities before tackling complex, mock-heavy UI or network interactions, as they offer the highest signal-to-noise ratio in tests.
## 2025-02-18 - Synthetic BMP Headers must use BITMAPINFOHEADER

**Learning:** When synthetically mocking BMP binary headers for image parsing tests without an external library, using a 12-byte `BITMAPCOREHEADER` is insufficient if the underlying parser (like `getImageDimensions`) assumes a 40-byte `BITMAPINFOHEADER` and reads fixed offsets (18 and 22).

**Action:** Always ensure synthetic mock headers exactly match the layout expected by the parser rather than picking the smallest valid specification format, avoiding false failures.
## 2025-02-18 - Synthetic JPEG Headers exact layout for sequential parsers

**Learning:** When manually constructing synthetic JPEG binary headers, note that the length field of a segment (like APP0) includes the 2 bytes of the length field itself. The correct offset for the subsequent marker is `current_marker_offset + 2 + length_value`.

**Action:** Calculate the length value and the layout of the bytes exactly according to the parser loop arithmetic to avoid it searching in the wrong place and falling back, leading to uncovered execution paths.
