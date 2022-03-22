import hre from 'hardhat'

import { log, setSilent } from '../utils/deploy'
import { TASK_GET_ENGINE, USDC_RINKEBY, WETH_RINKEBY } from '../tasks/constants'

export async function main() {
  setSilent(false)
  const engine = await hre.run(TASK_GET_ENGINE, { risky: WETH_RINKEBY, stable: USDC_RINKEBY })

  log(`Got the engine for WETH`, engine.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
