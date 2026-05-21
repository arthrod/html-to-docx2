## 2024-05-18 - [Typed JustHTML options objects]

**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2024-05-18 - Type Lie Masked by Constructor Defaults
**Learning:** When typing class properties converted from JS, explicitly check the constructor parameters and destructuring defaults. An optional constructor parameter that defaults to `null` means the class property must be typed as `T | null`, even if the intended type is `T` (e.g., `message: string | null` in `ParseError` when `message = null` is passed as a default option). Typing it strictly as `string` creates a type lie that compiles but could crash at runtime if the downstream consumers try to call string methods on a `null` value.
**Action:** When migrating JS classes to TS, always examine the constructor default assignments. If a default is `null`, the corresponding property type must explicitly include `| null`.
## 2025-02-24 - Typed selector recursive functions with boolean return

**Learning:** Circular inferences in recursive functions or mutually recursive methods trigger `TS(7023)` (implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions). In parser/selector logic, matching functions typically have a deterministic `boolean` return type.
**Action:** When encountering `@ts-expect-error TS(7023)` on interdependent matching or traversal functions, trace the base cases to confirm the intended return value (e.g., `false` or `true`) and add an explicit `boolean` return type annotation to break the inference loop safely.
