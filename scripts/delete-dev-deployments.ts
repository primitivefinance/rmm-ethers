import fs from 'fs'
import path from 'path'

const deploymentsDir = 'deployments'
const devDeploymentName = 'dev.json'

const exists = (file: string) => fs.existsSync(file) && fs.lstatSync(file).isFile()

const devDeployments = () =>
  fs
    .readdirSync(deploymentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== 'backfill')
    .map(deploymentDir => path.join(deploymentsDir, deploymentDir.name, devDeploymentName))
    .concat(path.join(deploymentsDir, devDeploymentName))
    .filter(exists)

async function main() {
  devDeployments().forEach(devDeployment => fs.unlinkSync(devDeployment))

  await deleteLog(1337)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

export async function deleteLog(chainId: number, path?: string) {
  try {
    const logRaw = await fs.promises.readFile(path ? path : './deployments/default/pools.json', {
      encoding: 'utf-8',
      flag: 'a+',
    })
    let log

    if (logRaw.length === 0) {
      log = {}
    } else {
      log = JSON.parse(logRaw)
    }

    if (!log[chainId]) {
      log[chainId] = {}
    }

    log[chainId] = {}

    await fs.promises.writeFile(path ? path : './deployments/default/pools.json', JSON.stringify(log, null, 2))
  } catch (e) {
    console.error(e)
  }
}
