## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.
## 2025-05-16 - 🛡️ Sentinel: [HIGH] Fix SSRF vulnerability in image downloading
**Vulnerability:** Server-Side Request Forgery (SSRF) allowed downloading images from local/internal IPs (e.g. `localhost`, `127.0.0.1`, AWS metadata `169.254.169.254`) by failing to validate URLs in image fetchers (`src/utils/image-to-base64.ts`, `src/utils/image-browser.ts`, and `src/utils/image.ts`).
**Learning:** URL validations must block hostname manipulation tricks, such as numeric IPv4 (`http://0177.0.0.1`), hex IPs (`http://0x7f000001`), and DNS rebinding bypasses like `nip.io`. The `URL` constructor normalizes IPs, making robust hostname regex checks more reliable.
**Prevention:** Implement a strict URL validator (`isSSRFSafeURL` in `src/utils/url.ts`) that verifies hostnames against known private IPv4/IPv6 ranges, loopback addresses, internal `.local` domains, and metadata IPs before executing network requests in all image fetching utilities.
