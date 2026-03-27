
## 2024-05-18 - Prevent fetch LFI/SSRF using native URL constructor bypass prevention
**Vulnerability:** fetch calls used unvalidated URLs, allowing Local File Inclusion (LFI) via Bun's native `file://` support, and Server-Side Request Forgery (SSRF). Initial fixes using regexes (like `/^[a-zA-Z]+:/`) were inadequate because `fetch` strips leading whitespace but standard regex tests don't, allowing bypasses like `" file:///etc/passwd"`.
**Learning:** URL validation for `fetch` must mirror `fetch`'s own parsing engine. Regular expressions are an anti-pattern for URL safety checks because they fail to account for implicit whitespace stripping and C0 control character normalizations that standard parsers execute.
**Prevention:** Always use the native `URL` constructor (e.g., `new URL(url).protocol`) to validate URL properties securely before network requests, and avoid swallowing errors for control-flow logic.
