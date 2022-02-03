import { subtask } from 'hardhat/config'
import { Wei, Percentage } from 'web3-units'
import { Engine } from '@primitivefi/rmm-sdk'
import { TASK_GET_CALIBRATION } from './constants'

subtask(TASK_GET_CALIBRATION, 'uses a poolId to get the calibration state of an engine')
  .addFlag('log', 'logs the result in a human readable format')
  .addParam('engine', 'engine address to query')
  .addParam('poolId', 'calibration state for pool to query')
  .setAction(async (args, hre) => {
    const signer = await hre.run('useSigner')
    const engine = new hre.ethers.Contract(args.engine, Engine.ABI, signer)

    const calibration = await engine.calibrations(args.poolId)

    if (args.log) {
      const stable = await engine.stable()
      const { contract: token } = await hre.run('useToken', { address: stable })
      const decimals = await token.decimals()

      console.log(`
        strike: ${new Wei(calibration.strike, decimals).float}
        sigma: ${new Percentage(calibration.sigma).float}
        maturity: ${calibration.maturity}
        gamma: ${new Percentage(calibration.gamma).float}
        lastTimestamp: ${calibration.lastTimestamp}
      `)
    }

    return calibration
  })
