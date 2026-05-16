## 2026-05-16 - 🧹 Sentinel: [code health improvement] Refactor overly long DocxDocument.generateDocumentXML into smaller helpers
**Vulnerability:** Not a security vulnerability, but a code health issue where `generateDocumentXML` inside `DocxDocument` was an overly long function (125 lines) mixing XML tree composition, namespace post-processing, and schema order re-arrangement.
**Learning:** Extracting string-based regex post-processing into clear, standalone top-level pure functions (e.g., `fixNamespacePrefixes`, `fixOOXMLSchemaOrder`) makes the core class methods much simpler and avoids cognitive overload.
**Prevention:** Keep top-level pure functions for text processing rather than embedding massive regex `replace` blocks inside object composition logic.
