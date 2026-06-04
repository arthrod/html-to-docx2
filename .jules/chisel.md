## 2024-05-18 - [Typed JustHTML options objects]

**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2024-05-18 - Type Lie Masked by Constructor Defaults
**Learning:** When typing class properties converted from JS, explicitly check the constructor parameters and destructuring defaults. An optional constructor parameter that defaults to `null` means the class property must be typed as `T | null`, even if the intended type is `T` (e.g., `message: string | null` in `ParseError` when `message = null` is passed as a default option). Typing it strictly as `string` creates a type lie that compiles but could crash at runtime if the downstream consumers try to call string methods on a `null` value.
**Action:** When migrating JS classes to TS, always examine the constructor default assignments. If a default is `null`, the corresponding property type must explicitly include `| null`.
## 2024-05-18 - [Explicitly type recursive functions]

**Learning:** `TS(7023)` implicit `any` return type errors often occur when recursive methods call themselves. Because of the mutual or direct recursion, the compiler cannot automatically infer the return type.
**Action:** Always add explicit return type annotations (`: boolean`, `: string`, etc.) to the method signatures of recursive functions to satisfy the type checker and resolve implicit `any` errors securely without using type assertions.
## 2025-02-14 - Default Parameters Mask Types
**Learning:** In legacy JS codebases migrated to TS, default parameters like `value = null` or `array = []` cause TypeScript to incorrectly infer the types as strictly `null` or `never[]`. This leads to `TS(2345)` errors down the line when the actual values (e.g., strings or populated arrays) are pushed or assigned.
**Action:** Always explicitly annotate default parameters and array initializations (e.g., `value: any = null`, `array: Type[] = []`) to prevent overly narrow type inference and safely remove `@ts-expect-error`s.
## 2025-02-28 - Typed html5lib_serializer `attrListToDict` attrs array

**Learning:** When removing `any` from functions that iterate over parsed AST attributes (like `attrs`), it is crucial to handle the exact shape the parser provides. Often, a token stream parser provides attributes as an array of objects `{ name, value }` or as a dictionary, or it may be omitted (`null`/`undefined`). Blindly casting `any` to a dictionary or another `any` violates type safety and causes regressions. In this PR, `html5lib` attributes must account for both `Array<{ name?: unknown; value?: unknown }>` and `Record<string, string | null>` inputs.

**Action:** Before removing `any` on utility function arguments, inspect the usage patterns inside the function body carefully (e.g. `Array.isArray(attrs)` and `entry.name`). Ensure you type arrays as `Array<{...}>` rather than just `any[]` if possible to avoid cascading type assertions.
