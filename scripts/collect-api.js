const fs = require('fs-extra')
const path = require('path')

const filesToCollect = ['temp/rmm-ethers.api.json']

const outputDir = 'temp/sdk-api'

fs.removeSync(outputDir)
fs.mkdirSync(outputDir, { recursive: true })

filesToCollect.forEach(file => fs.copyFileSync(file, path.join(outputDir, path.basename(file))))
