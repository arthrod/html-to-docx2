import { readFileSync, writeFileSync } from 'fs'

const path = 'src/helpers/xml-builder.ts'
let content = readFileSync(path, 'utf-8')

content = content.replace(
  /;\(Object\.keys\(attributes\) as Array<keyof RunAttributes>\)\.forEach\(\(key\) => \{\n\s*const value = attributes\[key\]/g,
  'for (const key in attributes) {\n      if (!Object.prototype.hasOwnProperty.call(attributes, key)) continue\n      const value = attributes[key as keyof RunAttributes]'
)

// we must carefully replace the ending parenthesis of the forEach on buildRunProperties
// looking at the code around line 950:
//       if (formattingFragment) {
//         runPropertiesFragment.import(formattingFragment)
//       }
//     })

content = content.replace(
  /runPropertiesFragment\.import\(formattingFragment\)\n      \}\n    \}\)/g,
  'runPropertiesFragment.import(formattingFragment)\n      }\n    }'
)

content = content.replace(
  /Object\.keys\(bordersObject\)\.forEach\(\(borderName\) => \{\n\s*const border = bordersObject\[borderName as keyof typeof bordersObject\]/g,
  'for (const borderName in bordersObject) {\n    if (!Object.prototype.hasOwnProperty.call(bordersObject, borderName)) continue\n    const border = bordersObject[borderName as keyof typeof bordersObject]'
)

content = content.replace(
  /paragraphBorderFragment\.import\(borderFragment\)\n    \}\n  \}\)/g,
  'paragraphBorderFragment.import(borderFragment)\n    }\n  }'
)

writeFileSync(path, content)
