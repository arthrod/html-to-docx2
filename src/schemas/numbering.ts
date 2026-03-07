import namespaces from '../namespaces'

type NumberingNamespaces = Pick<
  typeof namespaces,
  'o' | 'r' | 'v' | 've' | 'w' | 'w10' | 'wne' | 'wp'
>

const numberingNamespaces: NumberingNamespaces = {
  o: namespaces.o,
  r: namespaces.r,
  v: namespaces.v,
  ve: namespaces.ve,
  w: namespaces.w,
  w10: namespaces.w10,
  wne: namespaces.wne,
  wp: namespaces.wp,
}

const generateNumberingXMLTemplate = (): string => `
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>

        <w:numbering
        xmlns:w="${numberingNamespaces.w}"
        xmlns:ve="${numberingNamespaces.ve}"
        xmlns:o="${numberingNamespaces.o}"
        xmlns:r="${numberingNamespaces.r}"
        xmlns:v="${numberingNamespaces.v}"
        xmlns:wp="${numberingNamespaces.wp}"
        xmlns:w10="${numberingNamespaces.w10}"
        xmlns:wne="${numberingNamespaces.wne}">
        </w:numbering>
    `

export default generateNumberingXMLTemplate
