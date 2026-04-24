# Packet 01 — src/treebuilder.ts (Part 1 of 2)

**File:** `src/treebuilder.ts`
**Errors in this packet:** 20 (of 39 total in this file)
**Lines with `@ts-expect-error`:** 47, 361, 728, 1082, 1085, 1103, 1111, 1126, 1268, 2062, 2183, 2185, 2209, 2211, 2264, 2284, 2287, 2297, 2533, 2540

## Error breakdown

### 1. Null-to-string assignment (lines 47, 2183, 2185, 2533)
```
TS(2322): Type 'null' is not assignable to type 'string | undefined'
```
These occur when creating `new Node(...)` with `{ namespace: null }`. The `Node` constructor's `namespace` parameter defaults to `"html"` but the code intentionally passes `null`.

**Fix:** In `src/node.ts`, the constructor parameter type should allow `null`. Widen the `namespace` field type to `string | null`. Then these assignments become valid.

### 2. Object.entries on untyped object (lines 361, 728, 1268, 2645, 3136, 3167)
```
TS(2550): Property 'entries' does not exist on type 'ObjectConstructor'
```
The tsconfig targets `es2016` which doesn't include `Object.entries`.

**Fix:** Change `tsconfig.json` `"target"` to `"es2017"` or add `"lib": ["ES2017"]`. This fixes ALL `Object.entries` and `String.prototype.replaceAll` issues across the entire codebase.

### 3. Implicit return type 'any' from recursive functions (lines 1082, 1111, 1126, 2062, 3104)
```
TS(7023): 'handleTagInBody'/'handleEofInBody'/'modeInBody'/'modeInTemplate'/'_find_element' implicitly has return type 'any'
```
These are recursive mode-handler functions that return `TokenSinkResult.Continue` or call themselves/each other.

**Fix:** Add explicit return type annotations. Most return `number | null` (from `TokenSinkResult`). For `_find_element`, trace the return to determine its type.

### 4. Element implicitly has 'any' type via index expression (lines 1085, 1103, 3142, 3146, 3151, 3158, 3239)
```
TS(7053): Element implicitly has an 'any' type because expression of type 'string' can't be used to index type...
```
Indexing into adjustment objects (`SVG_ATTRIBUTE_ADJUSTMENTS`, `MATHML_ATTRIBUTE_ADJUSTMENTS`, etc.) or attribute dictionaries with a string key.

**Fix:** Type the lookup objects with `Record<string, string>` or add index signatures. For attribute dicts, type them as `Record<string, string>`.

### 5. Property on 'never' type (lines 2209, 2211)
```
TS(2339): Property 'namespace'/'tag_name' does not exist on type 'never'
```
TypeScript narrows an array to `never` after exhaustive type checks. The code accesses `.namespace` and `.tag_name` on what TS considers an impossible value.

**Fix:** Add a type assertion or widen the array type to prevent over-narrowing.

### 6. Set<string> not assignable to expected type (lines 2264, 2284, 2287, 2297)
```
TS(2345): Argument of type 'Set<string>' is not assignable to parameter...
TS(2345): Argument of type '"p"'/'"caption"'/'"table"' is not assignable...
```
Functions like `elementInScope()` are called with both `Set<string>` and individual string arguments, but typed for only one.

**Fix:** Widen the parameter type to accept `string | Set<string>` or use overloads.

### 7. Object possibly null (lines 2540, 2542)
```
TS(2531): Object is possibly 'null'
```
Accessing properties on a value that may be null.

**Fix:** Add null checks or non-null assertions where the code guarantees non-null.
