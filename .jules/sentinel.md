## 2024-05-18 - SSRF and LFI vulnerabilities via unvalidated fetch

**Vulnerability:** Found that image downloading utilities (`downloadImageToBase64` in `image.ts` and `image-browser.ts`, and `downloadImage` in `image-to-base64.ts`) called `fetch(url)` without validating the protocol of the provided URL.
**Learning:** `fetch` inherently supports various URL schemes depending on the runtime (e.g., `file://` locally). Passing user-controlled URLs to `fetch` without scheme validation can lead to Server-Side Request Forgery (SSRF) and Local File Inclusion (LFI).
**Prevention:** Always parse untrusted URLs and strict-allowlist the URL protocol (e.g., checking that `protocol === 'http:' || protocol === 'https:' || protocol === 'data:' || protocol === 'blob:'`) before passing the URL to `fetch`. Additionally, custom protocol restrictions should be placed outside the `try` block of `new URL()` to avoid swallowing specific 'Invalid protocol' errors.
