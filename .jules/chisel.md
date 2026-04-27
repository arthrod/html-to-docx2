
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.

## 2024-05-23 - Typed SerializerOptions and replaced implicit any indexing on objects with correct Record

**Learning:** When you have a `options = {}` parameter and ts-expect-errors because properties are accessed on it and don't exist on `{}`, the proper fix is to look at all usages of `options.<property>` in that file/function, extract an interface out of them, and then type the `options` parameter with that interface. A similar trick is used to fix `const out = {}` where string properties are appended to the dictionary: give it a type `Record<string, string | null>` instead of `any`.

**Action:** Look for `options = {}` and implicit `{}` initialization. Extract interfaces when possible, and `Record` types when it acts as a dictionary.
