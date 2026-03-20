## 2025-03-20 - Type Mismatch across internal interfaces
**Learning:** In a JS-to-TS migration, `@ts-expect-error` often indicates duplicate, out-of-sync type definitions. `DocxDocumentInstance` was duplicated with slight variations across multiple files instead of extracting it to a shared type directory.
**Action:** Always search for duplicated types first before silencing the error or attempting complex type-casting.
