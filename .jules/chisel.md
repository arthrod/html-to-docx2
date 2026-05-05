
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2024-05-24 - Do not change runtime behavior to satisfy TS(2367) dead-code warnings
**Learning:** When addressing `TS(2367)` ("types have no overlap") errors where an inferred literal union is checked against unhandled literal strings (e.g. `enc === 'utf-32'`), adding the missing literal to the function's runtime logic is extremely dangerous, as it alters standard behavior (e.g., WHATWG encoding standard ignores `'utf-32'`). Alternatively, attempting to silence it by artificially widening the return type of the upstream function to `string | null` breaks the precise literal inference that TS uses to find dead code, which is "type theater".
**Action:** The correct action is to eliminate the dead code checks (the `if (enc === 'utf-32')` conditions) rather than widening types or modifying runtime output.
