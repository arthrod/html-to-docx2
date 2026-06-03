## 2025-02-14 - Fix ReDoS and Protocol Bypass in SVG Sanitizer
**Vulnerability:** ReDoS and Protocol Evasion in `URL_REGEX`. An attacker could bypass protocol sanitization checks for attributes like `fill` or `style` by supplying newlines inside `url(...)` because the standard dot (`.`) in `.*?` does not match line terminators.
**Learning:** Checking for malicious protocols by extracting inner strings requires regexes that correctly capture line breaks, since CSS/SVG processors often accept multiline values inside `url()`.
**Prevention:** Always use `[\s\S]*?` or similar constructs to ensure cross-newline extraction when parsing untrusted URLs from functional notation.
