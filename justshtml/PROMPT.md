# TypeScript Migration: Fix @ts-expect-error suppressions in justshtml

## Overview

This project is a TypeScript conversion of [simonw/justjshtml](https://github.com/simonw/justjshtml), a zero-dependency HTML5 parser. The JavaScript source was converted using `ts-migrate` (TypeScript 4.9.5), which renamed `.js` → `.ts` files and applied automated codemods. The result compiles with zero errors, but **154 `@ts-expect-error` suppressions** remain across 19 files. Your job is to fix the underlying type issues and remove every `@ts-expect-error` comment.

## Goal

Remove all 154 `@ts-expect-error TS(XXXX) FIXME:` comments by fixing the actual type errors. When done, `npx tsc --noEmit` must pass with **zero errors** and **zero `@ts-expect-error` comments** remaining.

## Constraints

1. **Do not change runtime behavior.** Every fix must be a type-level change (type annotations, interface definitions, tsconfig options, `as` casts as last resort). No logic changes.
2. **Prefer structural fixes over casts.** Widening a type, adding an interface, or bumping a tsconfig option is better than `as any`.
3. **Run `npx tsc --noEmit` after each packet** to verify progress. Errors should decrease monotonically.
4. **Commit after each packet** with a message like: `refactor(types): packet NN — <short description>`.
5. **Do not introduce new `@ts-expect-error` or `@ts-ignore` comments.**
6. **Do not add runtime dependencies.** `@types/node` as a devDependency is fine.

## Architecture

```
src/
  index.ts          ← Public re-exports
  justhtml.ts       ← Main JustHTML class (entry point)
  parser.ts         ← parseDocument() function
  tokenizer.ts      ← HTML5 tokenizer (largest file, ~67KB, no errors)
  treebuilder.ts    ← HTML5 tree builder (~107KB, 39 errors — heaviest)
  treebuilder_utils.ts ← Helper enums/functions for treebuilder
  node.ts           ← Node class (DOM-like tree node)
  tokens.ts         ← Token classes (Tag, CharacterToken, etc.)
  context.ts        ← FragmentContext class
  constants.ts      ← Lookup tables (SVG/MathML adjustments, void elements, etc.)
  entities.ts       ← Named/numeric entity decoder
  entities-data.ts  ← Giant NAMED_ENTITIES object (~37KB, no errors itself)
  encoding.ts       ← HTML encoding sniffer/decoder
  selector.ts       ← CSS selector parser/matcher
  serialize.ts      ← HTML serializer (toHTML, toTestFormat)
  html5lib_serializer.ts ← html5lib-compatible token stream serializer
  stream.ts         ← Streaming tokenizer API
  markdown.ts       ← Markdown serializer (no errors)
scripts/
  run-*-tests.ts    ← Test runners (import node: modules, use process, Buffer)
  smoke.ts          ← Smoke test
```

## Global Prerequisites (apply before any packet)

These tsconfig/dependency changes resolve ~60% of all errors. Apply them first, commit, then proceed with packets.

### 1. Install `@types/node`
```bash
npm install --save-dev @types/node
```
Resolves: all `Cannot find module 'node:*'`, `Cannot find name 'process'`, `Cannot find name 'Buffer'` (40+ errors in scripts/).

### 2. Update tsconfig.json
```jsonc
{
  "compilerOptions": {
    "target": "ES2021",           // was "es2016" — enables Object.entries, replaceAll
    "module": "nodenext",         // was "commonjs" — enables import.meta, top-level await
    "moduleResolution": "nodenext",
    "lib": ["ES2021"],            // explicit lib for replaceAll, Object.entries
    // ... keep all other options unchanged
  }
}
```
Resolves: all `Object.entries` (9), `replaceAll` (7), `import.meta` (4), top-level `await` (4) errors = ~24 errors.

### After applying prerequisites, commit:
```
refactor(types): global prerequisites — @types/node, tsconfig target/module bump
```

## Packet Execution Order

Process packets **sequentially** (01 → 08). Some packets depend on changes made in earlier packets.

| # | Files | Errors | Key fix themes |
|---|-------|--------|---------------|
| 01 | `src/treebuilder.ts` (part 1) | 20 | Node null-namespace, Object.entries, recursive return types, index signatures, scope method overloads |
| 02 | `src/treebuilder.ts` (part 2) | 19 | Continuation: null guards, attribute index types, scope overloads |
| 03 | `src/selector.ts` + `src/entities.ts` | 18 | Token value type, constructor param types, recursive boolean returns, NAMED_ENTITIES Record type |
| 04 | `src/serialize.ts` + `src/html5lib_serializer.ts` + `src/encoding.ts` | 18 | Options interfaces, replaceAll, recursive return types, dead-code comparisons |
| 05 | `src/justhtml.ts` + `src/parser.ts` + `src/stream.ts` + `src/node.ts` + `src/constants.ts` | 14 | Options interfaces, Node type widening, NAMESPACE_URL_TO_PREFIX Record, openElements alias |
| 06 | `scripts/run-tokenizer-tests.ts` + `scripts/run-stream-tests.ts` + `scripts/smoke.ts` | 19 | Mostly resolved by prerequisites; remaining: recursive return types, index types |
| 07 | `scripts/run-encoding-tests.ts` + `scripts/run-serializer-tests.ts` | 22 | Mostly resolved by prerequisites; remaining: type assertions on parsed data |
| 08 | `scripts/run-tree-construction-tests.ts` + `scripts/run-markdown-tests.ts` + `scripts/run-selector-tests.ts` | 24 | Mostly resolved by prerequisites; remaining: Node property types, implicit any params |

## Common Error Patterns & Canonical Fixes

### Pattern A: `Property 'X' does not exist on type '{}'` (TS2339)
**Cause:** Destructuring `options = {}` without a type.
**Fix:** Define an interface and type the parameter.

### Pattern B: `Element implicitly has 'any' type` (TS7053)
**Cause:** Indexing into an object with a string key when the object has no index signature.
**Fix:** Add `Record<string, T>` type to the object, or add an explicit index signature.

### Pattern C: `Property 'entries'/'replaceAll' does not exist` (TS2550)
**Cause:** tsconfig `target` is too old.
**Fix:** Bump target/lib to ES2021 (global prerequisite).

### Pattern D: Implicit return type 'any' on recursive functions (TS7023)
**Cause:** TypeScript can't infer return types for mutually recursive functions.
**Fix:** Add explicit return type annotations (`: boolean`, `: string`, `: number | null`, etc.).

### Pattern E: `Type 'null' is not assignable to 'string | undefined'` (TS2322)
**Cause:** ts-migrate inferred overly narrow types on class fields.
**Fix:** Widen the field/parameter type to include `null`.

### Pattern F: `Cannot find module 'node:*'` / `Cannot find name 'process'` (TS2307/TS2580)
**Cause:** Missing `@types/node`.
**Fix:** Install @types/node and set module to nodenext (global prerequisite).

### Pattern G: `Argument of type 'Set<string>' not assignable` (TS2345)
**Cause:** A function accepts `string` but is also called with `Set<string>`.
**Fix:** Widen parameter type to `string | Set<string>` and adjust the function body to handle both.

## Challenges & Pitfalls

1. **treebuilder.ts is ~3200 lines.** It contains 39 of 154 errors. Read the file in sections; don't try to load it all at once. Focus on the lines listed in the packet files.

2. **Mutually recursive functions** in treebuilder (mode handlers call each other). You must add return types to ALL functions in a cycle for TS to stop complaining. Missing one will cause the error to persist.

3. **The Node class is the root type.** Many errors cascade from its `any`-typed fields. Properly typing `Node` (packet 05) will prevent issues in other packets. Consider processing packet 05 early or extracting the Node typing as a sub-prerequisite.

4. **entities-data.ts** is a ~37KB object literal. Adding `Record<string, string>` to its export type (packet 03) is a one-line fix that resolves 8 errors. Do not try to type each key individually.

5. **tsconfig changes affect ALL files at once.** After the global prerequisite commit, re-run `tsc --noEmit` to see the new baseline. Many scripts/ errors will vanish.

6. **`as` casts are a last resort.** Some patterns (like the `never` type on line 2209 of treebuilder.ts) may genuinely need a cast. Document why if you use one.

7. **Import paths use `.js` extensions** (e.g., `import { Node } from "./node.js"`). This is correct for ESM with `"module": "nodenext"`. Do not change these to `.ts`.

## Verification

After all 8 packets:
```bash
# Must pass with zero errors
npx tsc --noEmit

# Must return 0
grep -rn '@ts-expect-error' src/ scripts/ | wc -l
```

## Packet detail files

Each packet is documented in `packets/packet-NN-*.md` with:
- Exact file paths and line numbers
- Error codes and messages
- Specific fix instructions per error
- Dependencies on prior packets
