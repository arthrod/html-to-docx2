import { expect, test, describe } from 'vitest';
import { validateOMMLString } from '../src/utils/omml-sanitizer';

describe('OMML Sanitizer', () => {
  test('should accept valid OMML', () => {
    const validOMML = '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:r><m:t>x + y = z</m:t></m:r></m:oMath>';
    expect(validateOMMLString(validOMML)).toBe(true);
  });

  test('should reject OMML with DOCTYPE (XXE)', () => {
    const maliciousOMML = '<!DOCTYPE foo [<!ENTITY xxe "EXTRACTED">]> <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:r><m:t>&xxe;</m:t></m:r></m:oMath>';
    expect(validateOMMLString(maliciousOMML)).toBe(false);
  });

  test('should reject OMML with ENTITY (XXE)', () => {
    const maliciousOMML = '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:r><m:t><!ENTITY xxe "EXTRACTED"></m:t></m:r></m:oMath>';
    expect(validateOMMLString(maliciousOMML)).toBe(false);
  });

  test('should reject OMML with script tags (XSS)', () => {
    const maliciousOMML = '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:r><m:t><script>alert(1)</script></m:t></m:r></m:oMath>';
    expect(validateOMMLString(maliciousOMML)).toBe(false);
  });

  test('should reject OMML with XML processing instructions', () => {
    const maliciousOMML = '<?xml version="1.0"?><m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"></m:oMath>';
    expect(validateOMMLString(maliciousOMML)).toBe(false);
  });

  test('should reject OMML with CDATA sections', () => {
    const maliciousOMML = '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><![CDATA[something]]></m:oMath>';
    expect(validateOMMLString(maliciousOMML)).toBe(false);
  });

  test('should reject strings without m: namespace elements', () => {
    const invalidOMML = '<div>Not math</div>';
    expect(validateOMMLString(invalidOMML)).toBe(false);
  });

  test('should reject empty or non-string inputs', () => {
    expect(validateOMMLString('')).toBe(false);
    expect(validateOMMLString(null)).toBe(false);
    expect(validateOMMLString(undefined)).toBe(false);
  });
});
