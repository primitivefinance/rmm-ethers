import { subtask } from 'hardhat/config'
import { Engine } from '@primitivefi/rmm-sdk'
import { Wei } from 'web3-units'
import { TASK_GET_RESERVES } from './constants'

subtask(TASK_GET_RESERVES, 'uses a poolId to get the reserve state of an engine')
  .addFlag('log', 'logs the result in a human readable format')
  .addParam('engine', 'engine address to query')
  .addParam('poolId', 'reserve state for pool to query')
  .setAction(async (args, hre) => {
    const signer = await hre.run('useSigner')
    const engine = new hre.ethers.Contract(args.engine, Engine.ABI, signer)

    const reserve = await engine.reserves(args.poolId)

    if (args.log) {
      const risky = await engine.risky()
      const stable = await engine.stable()
      const [{ contract: token0 }, { contract: token1 }] = [
        await hre.run('useToken', { address: risky }),
        await hre.run('useToken', { address: stable }),
      ]
      const [decimals0, decimals1] = [await token0.decimals(), await token1.decimals()]

      console.log(`
        risky: ${new Wei(reserve.reserveRisky, decimals0).float}
        stable: ${new Wei(reserve.reserveStable, decimals1).float}
        liquidity: ${new Wei(reserve.liquidity, 18).float}
        blockTimestamp: ${reserve.blockTimestamp}
        cumulativeRisky: ${new Wei(reserve.cumulativeRisky, decimals0).float}
        cumulativeStable: ${new Wei(reserve.cumulativeStable, decimals1).float}
        cumulativeLiquidity: ${new Wei(reserve.cumulativeLiquidity, 18).float}
      `)
    }

    return reserve
  })
