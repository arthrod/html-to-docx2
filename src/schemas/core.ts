/* biome-ignore-all lint: legacy code */
import { applicationName } from '../constants'
import namespaces from '../namespaces'

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/**
 * Format a Date as local time with Z suffix.
 * Word uses local time with a trailing 'Z' in dcterms:created/modified
 * (non-standard but expected by the OOXML ecosystem).
 */
function toLocalWithZ(d: Date): string {
  const Y = d.getFullYear()
  const M = String(d.getMonth() + 1).padStart(2, '0')
  const D = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${Y}-${M}-${D}T${h}:${m}:${s}Z`
}

const formatMetadataDate = (value: Date): string =>
  value instanceof Date ? toLocalWithZ(value) : toLocalWithZ(new Date())

const generateCoreXML = (
  title: string = '',
  subject: string = '',
  creator: string = applicationName,
  keywords: string[] = [applicationName],
  description: string = '',
  lastModifiedBy: string = applicationName,
  revision: number = 1,
  createdAt: Date = new Date(),
  modifiedAt: Date = new Date()
): string => `
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>

        <cp:coreProperties
          xmlns:cp="${namespaces.coreProperties}"
          xmlns:dc="${namespaces.dc}"
          xmlns:dcterms="${namespaces.dcterms}"
          xmlns:dcmitype="${namespaces.dcmitype}"
          xmlns:xsi="${namespaces.xsi}"
          >
            <dc:title>${escapeXml(title)}</dc:title>
            <dc:subject>${escapeXml(subject)}</dc:subject>
            <dc:creator>${escapeXml(creator)}</dc:creator>
            <cp:keywords>${escapeXml(keywords.join(', '))}</cp:keywords>
            <dc:description>${escapeXml(description)}</dc:description>
            <cp:lastModifiedBy>${escapeXml(lastModifiedBy)}</cp:lastModifiedBy>
            <cp:revision>${revision}</cp:revision>
            <dcterms:created xsi:type="dcterms:W3CDTF">${formatMetadataDate(
              createdAt
            )}</dcterms:created>
            <dcterms:modified xsi:type="dcterms:W3CDTF">${formatMetadataDate(
              modifiedAt
            )}</dcterms:modified>
        </cp:coreProperties>
    `

export default generateCoreXML
