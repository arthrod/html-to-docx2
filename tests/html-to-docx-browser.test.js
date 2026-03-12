import { describe, expect, it } from 'vitest'
import HTMLtoDOCX from '../src/html-to-docx-browser'
import { addFilesToContainer } from '../src/html-to-docx-browser'

describe('html-to-docx-browser', () => {
  it('generates a Blob output', async () => {
    const result = await HTMLtoDOCX('<p>Hello World</p>')
    expect(result).toBeInstanceOf(Blob)
    expect(result.size).toBeGreaterThan(0)
    expect(result.type).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  })

  it('accepts header and footer HTML', async () => {
    const result = await HTMLtoDOCX(
      '<p>Body</p>',
      '<p>Header</p>',
      { header: true, footer: true },
      '<p>Footer</p>'
    )
    expect(result).toBeInstanceOf(Blob)
    expect(result.size).toBeGreaterThan(0)
  })

  it('exports addFilesToContainer', () => {
    expect(typeof addFilesToContainer).toBe('function')
  })
})
