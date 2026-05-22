## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.
## 2024-05-22 - XSS Bypass in SVG Sanitizer via `url()` Functional Notation

**Vulnerability:** The `hasDangerousProtocol` check in the SVG sanitizer only scanned `href` and `xlink:href` for `javascript:` or `data:` URIs. It failed to sanitize embedded `url()` functions within presentation attributes (like `fill`, `stroke`, `mask`, `clip-path`) or `style`, permitting XSS execution (e.g., `fill="url(javascript:alert(1))"`). Additionally, it broadly permitted any protocol except its limited blacklist.
**Learning:** Checking for malicious prefixes at the start of a string is insufficient for attributes that support functional notation or complex strings. Attackers will nest dangerous payloads inside `url(...)` or `background: url(...)`.
**Prevention:** Always maintain a strict mapping of attributes that support `url(...)` syntax. Use a non-greedy global regex to extract *all* nested URLs and run the protocol validation against each inner extraction. Additionally, explicitly whitelist safe MIME types for `data:` URIs (e.g., `image/png`) to prevent `data:image/svg+xml` or `data:text/html` bypasses.
