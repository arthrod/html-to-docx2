## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.
## 2024-05-16 - SSRF Fix
**Vulnerability:** Server-Side Request Forgery (SSRF) allowed the application to fetch internal network resources during image conversion.
**Learning:** `fetch` was not verifying whether the requested domain or IP was internal to the application network, potentially allowing extraction of sensitive configuration from services like metadata endpoints or bypassing firewalls.
**Prevention:** Implement an IP and hostname blocklist function (`isInternalUrl`) validating inputs like localhost, private IPv4 subnets, and IPv6 unique local/link-local addresses prior to processing fetch requests.
