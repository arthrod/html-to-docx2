# Packet 04 — src/serialize.ts + src/html5lib_serializer.ts + src/encoding.ts

## File 1: src/serialize.ts (8 errors)
**Lines:** 50, 94, 109, 122, 142, 150, 169, 192

### Error breakdown

#### 1. String.prototype.replaceAll (lines 50, 109, 122, 150)
```
TS(2550): Property 'replaceAll' does not exist on type 'string'
```
**Fix:** Resolved by tsconfig `"lib": ["ES2021"]` (global prerequisite).

#### 2. Property does not exist on '{}' (line 94)
```
TS(2339): Property 'foreignAttributeAdjustments' does not exist on type '{}'
```
The `toTestFormat` function destructures `options = {}` without typing it.

**Fix:** Define an interface for the options parameter:
```ts
interface TestFormatOptions {
  foreignAttributeAdjustments?: Record<string, string[]> | null;
}
```
Then type: `function toTestFormat(node: any, options: TestFormatOptions = {})`

#### 3. Object.entries on untyped object (line 142)
```
TS(2550): Property 'entries' does not exist on type 'ObjectConstructor'
```
**Fix:** Resolved by tsconfig target bump (global prerequisite).

#### 4. Implicit return type 'any' on recursive function (line 169)
```
TS(7023): 'nodeToHTML' implicitly has return type 'any'
```
Recursive function that returns strings.

**Fix:** Add explicit return type `: string`.

#### 5. Implicit type 'any' on variable (line 192)
```
TS(7022): 'childHTML' implicitly has type 'any' because it does not have a type annotation
```
**Fix:** Add explicit type: `const childHTML: string = nodeToHTML(...)`.

---

## File 2: src/html5lib_serializer.ts (7 errors)
**Lines:** 12, 20, 26, 371, 373, 383, 385

### Error breakdown

#### 1. Element implicitly has 'any' type (line 12)
```
TS(7053): Element implicitly has an 'any' type because expression of type 'string' can't be used to index type...
```
Indexing into `FOREIGN_ATTRIBUTE_ADJUSTMENTS` with a string.

**Fix:** Type `FOREIGN_ATTRIBUTE_ADJUSTMENTS` as `Record<string, string[]>` in constants.ts (shared fix with other packets).

#### 2. String.prototype.replaceAll (lines 20, 26)
```
TS(2550): Property 'replaceAll' does not exist on type 'string'
```
**Fix:** Resolved by tsconfig lib (global prerequisite).

#### 3. Property does not exist on '{}' (lines 371, 373, 383, 385)
```
TS(2339): Property 'inject_meta_charset' / 'encoding' / 'strip_whitespace' / 'escape_rcdata' does not exist on type '{}'
```
The `serializeSerializerTokenStream` function takes `options = {}` without typing it.

**Fix:** Define an interface:
```ts
interface SerializerOptions {
  inject_meta_charset?: boolean;
  encoding?: string | null;
  strip_whitespace?: boolean;
  escape_rcdata?: boolean;
  quote_attr_values?: boolean;
  minimize_boolean_attributes?: boolean;
  use_trailing_solidus?: boolean;
  escape_lt_in_attrs?: boolean;
  quote_char?: string | null;
}
```
Then type the parameter: `options: SerializerOptions = {}`

---

## File 3: src/encoding.ts (3 errors)
**Lines:** 131, 133, 135

### Error breakdown

#### 1. Condition always false (all 3 lines)
```
TS(2367): This condition will always return 'false' since the types have no overlap
```
In `normalizeMetaDeclaredEncoding`, after `normalizeEncodingLabel` returns, TypeScript knows `enc` can only be one of the return values. The check for `"utf-32"`, `"utf-32le"`, `"utf-32be"` can never be true because `normalizeEncodingLabel` never returns those strings.

**Fix:** These are defensive guards for future-proofing. Either:
1. Remove the dead comparisons (simplest, keeps TS happy)
2. Widen the return type of `normalizeEncodingLabel` to `string | null` instead of the narrow literal union (if you want to keep the guards)

Option 2 is safer — change the return type annotation of `normalizeEncodingLabel` to `string | null`.
