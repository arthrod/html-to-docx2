## 2024-05-18 - LFI via Bun's native fetch
**Vulnerability:** Local File Inclusion (LFI) risk due to Bun's `fetch()` supporting `file://` URLs natively, which could be exploited if user-provided URLs are passed directly to `fetch()` without validation.
**Learning:** In Bun environments, `fetch()` is not limited to HTTP/HTTPS, unlike typical browser environments. This introduces severe SSRF/LFI vectors when fetching remote resources (like images).
**Prevention:** Always strictly validate and restrict URL protocols to `http:` and `https:` (e.g., using `isValidUrl`) before passing any dynamic or user-supplied URL to `fetch()`.
