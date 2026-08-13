// @ts-check

import { validateOMMLString } from '../src/utils/omml-sanitizer'

const SAFE_OMML = '<m:oMath><m:r><m:t>x</m:t></m:r></m:oMath>'
const DEFAULT_NS_OMML =
  '<oMath xmlns="http://schemas.openxmlformats.org/officeDocument/2006/math"><r><t>x</t></r></oMath>'

describe('validateOMMLString', () => {
  test('accepts prefixed OMML and default-namespace OMML', () => {
    expect(validateOMMLString(SAFE_OMML).valid).toBe(true)
    expect(validateOMMLString(DEFAULT_NS_OMML).valid).toBe(true)
  })

  test('rejects empty or non-string input', () => {
    expect(validateOMMLString('').valid).toBe(false)
    expect(validateOMMLString(null).valid).toBe(false)
    expect(validateOMMLString(undefined).valid).toBe(false)
  })

  test('rejects DOCTYPE and ENTITY declarations', () => {
    expect(validateOMMLString(`${SAFE_OMML}<!DOCTYPE foo>`).valid).toBe(false)
    expect(
      validateOMMLString(`${SAFE_OMML}<!ENTITY xxe SYSTEM "file:///etc/passwd">`).valid
    ).toBe(false)
  })

  test('rejects any processing instruction, not only <?xml', () => {
    expect(validateOMMLString(`<?xml version="1.0"?>${SAFE_OMML}`).valid).toBe(false)
    expect(
      validateOMMLString(`<?import namespace="m" implementation="//evil"?>${SAFE_OMML}`)
        .valid
    ).toBe(false)
  })

  test('rejects markup declarations including CDATA and conditional sections', () => {
    expect(validateOMMLString(`${SAFE_OMML}<![CDATA[secret]]>`).valid).toBe(false)
    expect(validateOMMLString(`${SAFE_OMML}<![INCLUDE[ <m:r/> ]]>`).valid).toBe(false)
  })

  test('rejects script tags including self-closing and closing forms', () => {
    expect(validateOMMLString(`${SAFE_OMML}<script>alert(1)</script>`).valid).toBe(false)
    expect(validateOMMLString(`${SAFE_OMML}<script/>`).valid).toBe(false)
    expect(validateOMMLString(`${SAFE_OMML}</script>`).valid).toBe(false)
    expect(validateOMMLString(`${SAFE_OMML}<SCRIPT src="x">`).valid).toBe(false)
  })
})
