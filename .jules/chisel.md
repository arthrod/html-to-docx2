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

## 2024-05-18 - Replacing ad-hoc local type definitions
**Learning:** `src/helpers/render-document-file.ts` and `src/helpers/xml-builder.ts` contained local ad-hoc interface overlays `VNodeType` and `VTextType` representing virtual DOM nodes. These loose types allowed properties to be accessed using type assertions like `as VNodeType` even when the underlying node was just a union `VNode | VText`.
**Action:** Replace ad-hoc types by explicitly importing `VNode` and `VText` from `../vdom/index`, removing the duplicated definitions, and stripping redundant `as VNodeType` assertions down to either no assertion (if already narrowed by a type guard like `isVNode(node)`) or `as VNode` when safely known. This removes "lies" from the types without changing runtime execution.
