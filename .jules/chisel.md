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

## 2024-05-25 - Fix htmlString typing and remove `@ts-expect-error` in DocxDocument conversion
**Learning:** The `@ts-expect-error` used when calling `convertVTreeToXML(this, ...)` masked a real type difference: the `DocxDocument` instances could hold `null` for `htmlString`, while the consuming `DocxDocumentInstance` type incorrectly required a strict `string`. This exposed a latent bug where `convertHTML` could potentially be called with a null argument.
**Action:** Always ensure that interface declarations match the class instances they claim to represent. When `string | null` is discovered as the true shape, safely handle the null state (e.g. `htmlString || ''`) at the consumer instead of hiding the mismatch with a suppression comment.
## 2025-02-14 - Redundant Ad-Hoc Types Hiding Genuine Types
**Learning:** Redundant, loosely-defined ad-hoc type aliases (e.g., `type VNodeType = { ... }` with implicit `[key: string]: any` structures) that mask the true class structures (e.g., `VNode`) force the code into repetitive type assertions (`as VNodeType`) even when type guards (`isVNode(x)`) exist.
**Action:** Remove ad-hoc type aliases. Import and use the true class definitions from their origin modules (e.g., `import { VNode } from '../vdom'`). This allows existing type guards to narrow variables natively without manual `as` assertions.
