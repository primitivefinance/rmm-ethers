import fs from 'fs'
import path from 'path'

const outputDir = 'artifacts/contracts'
const inputDir = 'artifacts/@primitivefi/rmm-manager/contracts/PositionRenderer.sol'

const copyDeploymentsFrom = (externalArtifactsDir: string) => {
  const artifacts = fs.readdirSync(externalArtifactsDir)

  const targetFolder = path.join(outputDir, 'PositionRenderer.sol')
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder)
  }

  for (const artifact of artifacts) {
    fs.copyFileSync(path.join(externalArtifactsDir, artifact), path.join(targetFolder, artifact))
  }
}

copyDeploymentsFrom(inputDir)
