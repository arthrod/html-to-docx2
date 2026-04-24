# Packet 05 — src/justhtml.ts + src/parser.ts + src/stream.ts + src/node.ts + src/constants.ts

## File 1: src/justhtml.ts (6 errors)
**Lines:** 22, 24, 26, 28, 30, 32

### Error breakdown

#### 1. Property does not exist on '{}' (all 6 lines)
```
TS(2339): Property 'collectErrors' / 'encoding' / 'strict' / 'fragmentContext' / 'iframeSrcdoc' / 'tokenizerOpts' does not exist on type '{}'
```
The constructor destructures `options = {}` without typing the parameter.

**Fix:** Define an interface:
```ts
interface JustHTMLOptions {
  collectErrors?: boolean;
  encoding?: string | null;
  strict?: boolean;
  fragmentContext?: FragmentContext | null;
  iframeSrcdoc?: boolean;
  tokenizerOpts?: TokenizerOpts | null;
}
```
Then: `constructor(input: any, options: JustHTMLOptions = {})`

---

## File 2: src/parser.ts (5 errors)
**Lines:** 6, 8, 10, 12, 18

### Error breakdown

#### 1. Property does not exist on '{}' (lines 6, 8, 10, 12)
```
TS(2339): Property 'fragmentContext' / 'iframeSrcdoc' / 'collectErrors' / 'tokenizerOpts' does not exist on type '{}'
```
Same pattern as justhtml.ts — `options = {}` without typing.

**Fix:** Define an interface:
```ts
interface ParseOptions {
  fragmentContext?: FragmentContext | null;
  iframeSrcdoc?: boolean;
  collectErrors?: boolean;
  tokenizerOpts?: TokenizerOpts | null;
}
```
Then: `function parseDocument(html: any, options: ParseOptions = {})`

#### 2. Property 'openElements' does not exist on TreeBuilder (line 18)
```
TS(2551): Property 'openElements' does not exist on type 'TreeBuilder'. Did you mean 'open_elements'?
```
The code adds a camelCase alias (`openElements`) to the TreeBuilder instance, but the class only declares `open_elements`.

**Fix:** Add `openElements` as an optional property or getter on the `TreeBuilder` class.

---

## File 3: src/stream.ts (1 error)
**Line:** 60

### Error breakdown

#### 1. Left-hand side of instanceof (line 60)
```
TS(2358): The left-hand side of an 'instanceof' expression must be of type 'any' or of a type assignable to the 'Function' interface type
```
`tokenizerOpts instanceof TokenizerOpts` — the parameter `tokenizerOpts` is typed such that TS doesn't allow `instanceof` on it.

**Fix:** Ensure the parameter allows the `TokenizerOpts` class type: `tokenizerOpts?: TokenizerOpts | Record<string, any> | null`.

---

## File 4: src/node.ts (1 error)
**Line:** 24

### Error breakdown

#### 1. Null-to-string assignment (line 24)
```
TS(2322): Type 'null' is not assignable to type 'string | undefined'
```
`new Node("#document-fragment", { namespace: null })` — the namespace parameter doesn't allow `null`.

**Fix:** Widen the `namespace` parameter/field types in the Node constructor to `string | null`:
```ts
constructor(name: string, { attrs = null, data = null, namespace = "html" as string | null } = {})
```
This is a **key prerequisite** — it also fixes null-to-namespace errors in treebuilder.ts (packets 01/02).

---

## File 5: src/constants.ts (1 error)
**Line:** 143

### Error breakdown

#### 1. Element implicitly has 'any' type (line 143)
```
TS(7053): Element implicitly has an 'any' type because expression of type 'string' can't be used to index type...
```
`NAMESPACE_URL_TO_PREFIX[ns]` — indexing with a string key.

**Fix:** Type the constant:
```ts
export const NAMESPACE_URL_TO_PREFIX: Record<string, string> = { ... };
```
