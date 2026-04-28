## 2024-03-05 - Eliminated High-Overhead `cloneDeep` from XML Builders
**Learning:** `cloneDeep` from `es-toolkit` adds significant overhead when cloning static constants or simple objects in hot paths like `buildRunProperties` and `buildRun`. This overhead slows down document rendering extensively since these are called for every single formatting element.
**Action:** Replace `cloneDeep` with shallow spread `{ ...baseAttributes }` or direct assignment when processing `attributes` object in `xml-builder.ts`.
