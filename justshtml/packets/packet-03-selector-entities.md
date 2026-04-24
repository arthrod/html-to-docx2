# Packet 03 — src/selector.ts + src/entities.ts

## File 1: src/selector.ts (10 errors)
**Lines:** 139, 185, 192, 349, 399, 441, 504, 533, 559, 659

### Error breakdown

#### 1. String literal not assignable to parameter (lines 139, 185, 192)
```
TS(2345): Argument of type '" "'  / '"="' / 'string' is not assignable to parameter of type 'null | undefined'
```
The `Token` constructor has `value` typed as `any` (from ts-migrate), but the second parameter defaults to `null`. The TokenType values are string literals and the code passes strings where TS expected null.

**Fix:** Type `Token.value` as `string | null` in the constructor. This is the correct type — values are always strings or null.

#### 2. Array type mismatch on SelectorList/CompoundSelector constructors (lines 349, 399)
```
TS(2345): Argument of type '(ComplexSelector | null)[]' is not assignable...
TS(2345): Argument of type 'SimpleSelector[]' is not assignable...
```
The constructors default `selectors` to `[]` (inferred as `never[]`), so passing a typed array fails.

**Fix:** Add explicit parameter types:
- `SelectorList`: `constructor(selectors: (ComplexSelector | null)[] = [])`
- `CompoundSelector`: `constructor(selectors: SimpleSelector[] = [])`

#### 3. Implicit return type 'any' on recursive methods (lines 441, 504, 559)
```
TS(7023): 'matches' / '_matchesSimple' / '_matchesPseudo' implicitly has return type 'any'
```
These methods call each other recursively, so TS can't infer the return type.

**Fix:** Add explicit `: boolean` return type annotations to all three methods.

#### 4. Object.entries on untyped object (line 533)
```
TS(2550): Property 'entries' does not exist on type 'ObjectConstructor'
```
**Fix:** Already resolved by the tsconfig `target: "es2017"` change (prerequisite from packet 01).

#### 5. String.prototype.replaceAll (line 659)
```
TS(2550): Property 'replaceAll' does not exist on type 'string'
```
**Fix:** Already resolved by the tsconfig lib/target change. `replaceAll` requires ES2021 or adding `"lib": ["ES2021"]`.

---

## File 2: src/entities.ts (8 errors)
**Lines:** 231, 233, 244, 246, 259, 268, 278, 280

### Error breakdown

#### 1. Element implicitly has 'any' type via index expression (all 8 lines)
```
TS(7053): Element implicitly has an 'any' type because expression of type 'string' can't be used to index type...
```
All 8 errors are the same pattern: `NAMED_ENTITIES[entityName]` where `NAMED_ENTITIES` is imported from `entities-data.ts` and is a large object keyed by entity names.

**Fix:** In `src/entities-data.ts`, add an explicit type annotation:
```ts
export const NAMED_ENTITIES: Record<string, string> = { ... };
```
This single change resolves all 8 errors in this file.
