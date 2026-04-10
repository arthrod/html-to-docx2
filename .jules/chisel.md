
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2026-04-10 - Custom Node Class vs DOM Node
**Learning:** When migrating HTML parser code (like ), properties explicitly tracking node structures (e.g., `openElements`) must be typed using the parser's custom `Node` class (e.g., from `./node.js`), rather than relying on the implicit global DOM `Node`.
**Action:** Ensure custom DOM-like classes are imported appropriately when adding types to parsing logic.
## 2026-04-10 - Custom Node Class vs DOM Node
**Learning:** When migrating HTML parser code, properties tracking node structures must be typed using the parser's custom Node class rather than relying on the implicit global DOM Node.
**Action:** Ensure custom DOM-like classes are imported appropriately when adding types to parsing logic.
