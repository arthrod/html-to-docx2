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
## 2024-06-20 - SSRF Bypass via IPv6 Variations and IPv4-Mapped IPv6 Addresses
**Vulnerability:** The `isPrivateOrLocalHost` function in `src/utils/url.ts` was vulnerable to Server-Side Request Forgery (SSRF) bypasses. It failed to identify and block the IPv6 unspecified address (`[::]`), IPv6 link-local addresses (`fe80::/10`), IPv6 unique local addresses (`fc00::/7`), and IPv4-mapped IPv6 addresses (`::ffff:127.0.0.1`), allowing an attacker to access local or private services by using these IPv6 representations. It also failed to correctly block negative integer representations of IP addresses.
**Learning:** URL parsers and network stacks often automatically resolve various IPv6 representations (and mapped IPv4 addresses) and integer representations into standard loopback or local addresses. Simple string matching against `127.0.0.1` or `localhost` is insufficient because an attacker can supply syntactically different but semantically identical IP addresses. Negative integers can be parsed into valid IPv4 addresses by JavaScript bitwise operators if not explicitly cast to unsigned integers (e.g., using `>>> 0`).
**Prevention:** Implement strict regex-based blocking for all relevant IPv6 local/private CIDR blocks (link-local, unique-local, unspecified). For IPv4-mapped IPv6 addresses, extract the embedded IPv4 address and recursively validate it against existing IPv4 checks. Always use zero-fill right shift (`>>> 0`) when parsing IP components to ensure negative signed integers are correctly cast to unsigned 32-bit integers before bitwise evaluation.
