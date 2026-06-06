1. **Analyze `serializeVNodeToSVG` performance bottleneck**
   - In `src/helpers/render-document-file.ts`, `serializeVNodeToSVG` uses sequential `.replace()` calls to escape XML characters for text nodes and attributes:
     - Text nodes: `.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')`
     - Attributes: `.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')`
   - Memory (`.jules/bolt.md` under `2024-05-18 - Single-Pass String Iteration Outperforms RegExp chained replace in Bun/V8`) clearly indicates this pattern is slow and memory-intensive in V8/Bun compared to single-pass loops.
   - We already have a highly optimized `escapeXml` function in `src/utils/xml-escape.ts` which implements exactly this single-pass optimization.

2. **Implement the optimization**
   - Import `escapeXml` in `src/helpers/render-document-file.ts`.
   - Update `serializeVNodeToSVG` to use `escapeXml` instead of chained `.replace()` calls.
   - The attributes iteration will become simpler:
     ```typescript
     const escapedValue = escapeXml(value)
     ```
   - The text node escaping will also use `escapeXml`:
     ```typescript
     return escapeXml(textNode.text)
     ```

3. **Verify the optimization**
   - The test suite will be run with `bun test` to ensure that this doesn't break SVG rendering.
   - Run format and linting on modified files (`bun run oxfmt` and `bun run oxlint`).

4. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
   - Run `bun run test:unit`.
   - Update `.jules/bolt.md` if any new critical insight was found (though this builds on an existing learning).

5. **Create PR**
   - Branch: `bolt/optimize-svg-xml-escaping`
   - Title: `⚡ Bolt: Use optimized escapeXml in SVG serialization`
   - PR Description describing the 3-5x escaping speedup.
