import JSZip from 'jszip'
import { addFilesToContainer } from './html-to-docx'
import type { DocumentOptions } from './index-base'

const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

async function generateContainer(
  htmlString: string,
  headerHTMLString?: string | null,
  documentOptions: DocumentOptions = {},
  footerHTMLString?: string | null
): Promise<Blob> {
  const zip = new JSZip()

  await addFilesToContainer(
    zip,
    htmlString,
    documentOptions,
    headerHTMLString,
    footerHTMLString
  )

  return zip.generateAsync({ type: 'blob', mimeType: DOCX_MIME_TYPE })
}

export { addFilesToContainer }
export default generateContainer
