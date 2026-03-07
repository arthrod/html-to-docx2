# Context

The browser bundle's .d.ts declares generateContainer returning Promise<Blob | Buffer | Uint8Array> and
exports NodeDocxResult = Buffer | Uint8Array. This is wrong — browser consumers should see Promise<Blob>
only. The runtime code is already correct (returns Blob in browser, Buffer in Node via detection), but
the types lie to browser consumers, forcing them to handle Buffer which can never appear.

Both dist/browser.d.ts and dist/index.d.ts are currently identical because both entry points
(src/browser.ts, src/node.ts) are one-line pass-throughs to src/index.ts.

Approach: Typed wrappers + shared base module (D3)

Create src/index-base.ts with all shared exports. Each entry point re-exports from it and adds
platform-specific return types via as casts (zero runtime cost — erased by TypeScript, then flattened by
tsdown).

Changes

1.  Create src/index-base.ts

Extract everything from current src/index.ts EXCEPT:

- The default export / HTMLtoDOCX
- BrowserDocxResult, NodeDocxResult, HtmlToDocxResult

This becomes the shared surface both entry points re-export.

2.  Rewrite src/browser.ts

import { default as \_generateContainer } from './html-to-docx'
import type { DocumentOptions } from './index-base'

const generateContainer = \_generateContainer as (
htmlString: string,
headerHTMLString?: string | null,
documentOptions?: DocumentOptions,
footerHTMLString?: string | null
) => Promise<Blob>

export { generateContainer as HTMLtoDOCX }
export default generateContainer
export \* from './index-base'

export type BrowserDocxResult = Blob
export type HtmlToDocxResult = Blob
// NO NodeDocxResult export

3.  Rewrite src/node.ts

import { default as \_generateContainer } from './html-to-docx'
import type { DocumentOptions } from './index-base'

const generateContainer = \_generateContainer as (
htmlString: string,
headerHTMLString?: string | null,
documentOptions?: DocumentOptions,
footerHTMLString?: string | null
) => Promise<Buffer | Uint8Array>

export { generateContainer as HTMLtoDOCX }
export default generateContainer
export \* from './index-base'

export type NodeDocxResult = Buffer | Uint8Array
export type HtmlToDocxResult = Buffer | Uint8Array
// NO BrowserDocxResult export

4.  Simplify src/index.ts

export \* from './index-base'
export { default as HTMLtoDOCX, default } from './html-to-docx'

// Keep union types for backward compat (direct/unconditioned imports)
export type BrowserDocxResult = Blob
export type NodeDocxResult = Buffer | Uint8Array
export type HtmlToDocxResult = BrowserDocxResult | NodeDocxResult

5.  Update scripts/check-api-parity.cjs

Replace byte-identical check with structural comparison that strips known platform-specific patterns
(return type Promise<Blob> vs Promise<Buffer | Uint8Array>, result type aliases) before comparing.
Unexpected differences still fail the check.

6.  Add "sideEffects": false to package.json

Unlocks aggressive tree-shaking for consumers who only import HTMLtoDOCX — bundlers can drop all ~60
unused constant/tracking/utility exports.

7.  Regenerate API surface files

Run bun run build + bun run api:check to regenerate api-surface/browser.rollup.d.ts and
api-surface/node.rollup.d.ts with the now-different type signatures.

Files to modify

┌──────────────────────────────┬──────────────────────────────────┐
│ File │ Action │
├──────────────────────────────┼──────────────────────────────────┤
│ src/index-base.ts │ Create (extracted from index.ts) │
├──────────────────────────────┼──────────────────────────────────┤
│ src/browser.ts │ Rewrite │
├──────────────────────────────┼──────────────────────────────────┤
│ src/node.ts │ Rewrite │
├──────────────────────────────┼──────────────────────────────────┤
│ src/index.ts │ Simplify │
├──────────────────────────────┼──────────────────────────────────┤
│ scripts/check-api-parity.cjs │ Update comparison logic │
├──────────────────────────────┼──────────────────────────────────┤
│ package.json │ Add "sideEffects": false │
├──────────────────────────────┼──────────────────────────────────┤
│ api-surface/\*.rollup.d.ts │ Regenerated automatically │
└──────────────────────────────┴──────────────────────────────────┘

Verification

1.  bun run build — must succeed, browser.d.ts should show Promise<Blob>, index.d.ts should show
    Promise<Buffer | Uint8Array>
2.  grep -c "Buffer" dist/browser.d.ts — should be 0
3.  grep "NodeDocxResult" dist/browser.d.ts — should find nothing
4.  bun run api:check — parity script passes with known diffs stripped
5.  bun test — existing tests pass (no runtime changes)
6.  bun run lint — no new lint errors
