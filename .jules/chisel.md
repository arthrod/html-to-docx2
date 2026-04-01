
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.

## 2024-05-24 - Typed stream options in justjshtml
**Learning:** Functions accepting options objects without types default to `any` or `null`, causing typescript errors in `instanceof` checks when comparing `any` to class constructors.
**Action:** Define an explicit interface for options objects to resolve implicit any destructuring and remove `@ts-expect-error` left over from JS-to-TS migration. Ensure `eslint --fix` isn't run blindly as it can introduce unrelated changes that violate the one conceptual fix per PR rule.