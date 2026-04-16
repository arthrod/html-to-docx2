
## 2024-05-18 - Prevent SSRF and LFI in Fetch Operations
**Vulnerability:** `fetch` calls in `downloadImageToBase64` and `downloadImage` did not validate URL schemes, allowing local file inclusion via `file://` or server-side request forgery via unsupported protocols.
**Learning:** The native `URL` constructor does not restrict schemes automatically, and `fetch` natively supports `file://` in some environments.
**Prevention:** Always validate protocols using `new URL()` and check `.protocol` explicitly (allowing only `http:`, `https:`, `data:`, `blob:`) before executing `fetch`. Ensure custom protocol checks are placed outside the `try/catch` block for `new URL(...)` so that specific error messages are not swallowed.
