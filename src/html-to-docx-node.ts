import JSZip from 'jszip'
import { addFilesToContainer } from './html-to-docx'
import type { DocumentOptions } from './index-base'

async function generateContainer(
  htmlString: string,
  headerHTMLString?: string | null,
  documentOptions: DocumentOptions = {},
  footerHTMLString?: string | null
): Promise<Buffer> {
  const zip = new JSZip()

  await addFilesToContainer(
    zip,
    htmlString,
    documentOptions,
    headerHTMLString,
    footerHTMLString
  )

  return zip.generateAsync({ type: 'nodebuffer' })
}

export { addFilesToContainer }
export default generateContainer
