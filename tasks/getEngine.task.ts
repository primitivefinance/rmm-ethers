import { subtask } from 'hardhat/config'
import { Engine, FactoryManager } from '@primitivefi/rmm-sdk'

import { TASK_GET_ENGINE } from './constants/task-names'

subtask(TASK_GET_ENGINE, 'gets the engine contract using the factory given a risky and stable')
  .addFlag('log', 'log to console')
  .addParam('risky', 'risky token address')
  .addParam('stable', 'stable token address')
  .addOptionalParam('factory', 'an optional factory address')
  .setAction(async (args, hre) => {
    const signer = await hre.run('useSigner')
    const rmm = await hre.connect(signer, args.log)

    const address = await new hre.ethers.Contract(
      args.factory ?? rmm.connection.addresses.primitiveFactory,
      FactoryManager.ABI,
      signer,
    ).getEngine(args.risky, args.stable)
    const engine = new hre.ethers.Contract(address, Engine.ABI, signer)
    return engine
  })
