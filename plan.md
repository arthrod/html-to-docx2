1. **Analyze Coverage Gaps:** In `tests/image-dimensions.test.js`, coverage for `src/utils/image-dimensions.ts` is incomplete (lines 30-36, 38-44, 46-48, 50, 64-68, 86-90, 100-101 are uncovered).
   - Lines 30-50 cover JPEG dimension parsing.
   - Lines 64-68 cover BMP dimension parsing.
   - Lines 86-90 cover WebP VP8 dimension parsing.
   - Lines 100-101 cover WebP fallback processing.

2. **Write Tests:** Add tests to `tests/image-dimensions.test.js` to cover:
   - **JPEG:** Test `getImageDimensions` with `createMinimalJPEG` (already defined in the test file but not tested).
   - **BMP:** Test `getImageDimensions` with `createMinimalBMP` (already defined in the test file but not tested).
   - **WebP VP8:** Implement `createMinimalWebP_VP8` function to construct a minimal VP8 WebP header and test it.
   - **Malformed WebP/JPEG:** Create test cases for malformed or incomplete WebP and JPEG buffers that trigger the fallback return paths (`{ width: 100, height: 100, type: 'webp' }` and `{ width: 100, height: 100, type: 'jpg' }`).

3. **Verify:** Run `bun test tests/image-dimensions.test.js --coverage` and ensure 100% line and branch coverage for `src/utils/image-dimensions.ts`. Also make sure to verify failure when asserting incorrect values.

4. **Complete Pre Commit Steps:** Ensure proper testing, verification, review, and reflection are done.
