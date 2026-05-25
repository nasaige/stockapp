const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'english-ios-app')
const requiredFiles = [
  'index.html',
  'dicts/logistics_cross_border_ecommerce.json',
  'dicts/CET4_T.json',
]

for (const file of requiredFiles) {
  const fullPath = path.join(target, file)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Generated Qwerty app is missing ${file}`)
  }
}

console.log('Generated Qwerty Learner app is ready to publish.')
