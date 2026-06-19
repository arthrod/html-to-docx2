## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.

## 2024-05-31 - SVG URL Protocol Bypass via url() Notation

**Vulnerability:** The SVG sanitizer (`hasDangerousProtocol`) failed to extract and inspect protocols inside `url(...)` CSS functions, which are valid in attributes like `style`, `fill`, `filter`, etc. This allowed attackers to bypass checks using payloads like `style="background: url(javascript:alert(1))"`.
**Learning:** String prefix checks (`startsWith`, `test`) on the entire attribute value are insufficient because functional notations nest the actual target URI. Attackers can conceal dangerous protocols deeper within the string.
**Prevention:** Always extract embedded URIs using regex (e.g. `/url\(\s*(['"]?)(.*?)\1\s*\)/g`) and apply protocol validation logic strictly to the extracted inner URI, rather than the raw outer string. Also ensure a robust safe data URI regex (`/^\s*data:image\/(png|jpeg|gif|webp|bmp);base64,/i`) is explicitly enforced.

## 2025-05-16 - SSRF Vulnerability Via Private IP Access

**Vulnerability:** Even when URL protocols were restricted to HTTP/HTTPS, image fetching functions did not validate the destination hostname. This allowed Server-Side Request Forgery (SSRF) against internal resources (e.g. `localhost`, `127.0.0.1`, `169.254.169.254`), including bypassed IP formats (like octal/hex).
**Learning:** Checking for safe URL schemes isn't enough; the destination host itself must be verified to prevent SSRF against loopback addresses and private networks.
**Prevention:** Implement an IP/hostname validator (like `isPrivateOrLocalHost`) before sending outbound requests to block known local and private IP ranges.

## 2025-02-28 - SSRF Bypass via IPv6 Encodings
**Vulnerability:** The internal network filtering logic (`isPrivateOrLocalHost`) used to block Server-Side Request Forgery (SSRF) was circumventable. While it correctly checked standard local hostnames and IPv4 private network prefixes, it failed to account for equivalent IPv6 representations (`[::]`), IPv4-mapped IPv6 addresses (e.g., `[::ffff:127.0.0.1]`), and private IPv6 ranges such as link-local (`[fe80::/10]`) and unique-local (`[fc00::/7]`).
**Learning:** Checking for localhost strictly via hardcoded `127.0.0.1` and standard IPv4 addresses leaves the system vulnerable. Browsers, Node.js, and backend HTTP clients natively resolve several IPv6 variants to local boundaries or extract underlying IPv4 traffic, meaning a simple bypass (`http://[::]/admin`) will reach local internal services.
**Prevention:** Always cover the entire spectrum of IPv6 routing when writing network boundary rules. This includes the unspecified address `[::]`, proper regex boundaries for `[fe80...` and `[fc00...` to encompass the whole private/local CIDR blocks, and recursively validating the internal payload of mapped IPv4-in-IPv6 addresses.
