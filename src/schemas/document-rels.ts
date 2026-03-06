import namespaces from '../namespaces'
import type { OoxmlNamespaces } from '../namespaces'

type DocumentRelNamespaceKey = Extract<
  keyof OoxmlNamespaces,
  'numbering' | 'styles' | 'settingsRelation' | 'webSettingsRelation' | 'fontTable'
>

type DocumentRelationship = {
  id: number
  target: string
  type: DocumentRelNamespaceKey
}

const documentRelationships: DocumentRelationship[] = [
  { id: 1, target: 'numbering.xml', type: 'numbering' },
  { id: 2, target: 'styles.xml', type: 'styles' },
  { id: 3, target: 'settings.xml', type: 'settingsRelation' },
  { id: 4, target: 'webSettings.xml', type: 'webSettingsRelation' },
  { id: 5, target: 'fontTable.xml', type: 'fontTable' },
]

const documentRelsXML: string = `
  <?xml version="1.0" encoding="UTF-8" standalone="yes"?>

  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    ${documentRelationships
      .map(
        ({ id, target, type }) =>
          `<Relationship Id="rId${id}" Type="${namespaces[type]}" Target="${target}"/>`
      )
      .join('\n    ')}
  </Relationships>
`

export default documentRelsXML
