# Packet 02 — src/treebuilder.ts (Part 2 of 2)

**File:** `src/treebuilder.ts`
**Errors in this packet:** 19 (of 39 total in this file)
**Lines with `@ts-expect-error`:** 2542, 2565, 2580, 2645, 2952, 2988, 3032, 3046, 3051, 3056, 3104, 3110, 3136, 3142, 3146, 3151, 3158, 3167, 3239

## Error breakdown

### 1. Object possibly null (line 2542)
```
TS(2531): Object is possibly 'null'
```
Same pattern as packet 01. Continuation of the null-access chain.

**Fix:** Add null guard or non-null assertion (`!`).

### 2. Null-to-string assignment (lines 2565, 2580)
```
TS(2322): Type 'null' is not assignable to type 'string | undefined'
```
Same Node namespace pattern as packet 01.

**Fix:** Already resolved if Node's namespace type is widened in packet 01 (or earlier prerequisite).

### 3. Object.entries on untyped object (lines 2645, 3136, 3167)
```
TS(2550): Property 'entries' does not exist on type 'ObjectConstructor'
```
Same tsconfig target issue as packet 01.

**Fix:** Already resolved by bumping `target` to `es2017` (done globally).

### 4. Set<string> / string literal not assignable (lines 2952, 2988, 3032, 3046, 3051, 3056)
```
TS(2345): Argument of type 'Set<string>'/'caption'/'table' is not assignable to parameter...
```
The `elementInScope`/`hasElementInScope` family of methods accept a string but are also called with `Set<string>`. The method signatures need to accept both.

**Fix:** Change the target parameter type to `string | Set<string>` in the scope-checking methods: `_has_element_in_scope`, `_has_element_in_button_scope`, `_has_element_in_list_scope`, `_has_element_in_table_scope`, etc.

### 5. Implicit return type 'any' from recursive function (line 3104)
```
TS(7023): '_find_element' implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions
```
**Fix:** Add explicit return type annotation. It returns `Node | null`.

### 6. Implicit type 'any' on variable (line 3110)
```
TS(7022): 'found' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer
```
**Fix:** Add explicit type: `let found: Node | null = ...`.

### 7. Element implicitly has 'any' type via index (lines 3142, 3146, 3151, 3158, 3239)
```
TS(7053): Element implicitly has an 'any' type because expression of type 'string' can't be used to index type...
```
Indexing into `SVG_ATTRIBUTE_ADJUSTMENTS`, `MATHML_ATTRIBUTE_ADJUSTMENTS`, `SVG_TAG_NAME_ADJUSTMENTS`, and `FOREIGN_ATTRIBUTE_ADJUSTMENTS` with a string key.

**Fix:** Export these constants with explicit `Record<string, ...>` types from `constants.ts`, or use type assertions at the call sites.

## Dependencies on prior packets

This packet shares the same file as packet 01. The fixes are independent at the line level but both modify `src/treebuilder.ts`. Apply packet 01 first to avoid merge conflicts.

Several fixes here depend on changes from packet 01:
- The `target: "es2017"` tsconfig change (Object.entries)
- The Node namespace type widening (null assignments)
- The scope-method parameter widening (Set<string> args)
