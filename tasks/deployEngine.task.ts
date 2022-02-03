import { task } from 'hardhat/config'

import { Signer } from '@ethersproject/abstract-signer'
import { DefenderRelaySigner } from 'defender-relay-client/lib/ethers'

import { TASK_DEPLOY_ENGINE } from './constants/task-names'

import { deployEngine } from '../utils/deployEngine'

type Signers = Signer | DefenderRelaySigner

task(TASK_DEPLOY_ENGINE, 'deploys an engine from the factory using a risky and stable')
  .addFlag('log', 'enable logging')
  .addParam('risky', 'risky token address')
  .addParam('stable', 'stable token address')
  .addOptionalParam('factory', 'an optional factory address')
  .setAction(async (args, hre) => {
    const { risky, stable } = args
    const signer: Signers = await hre.run('useSigner', { log: args.log })
    const rmm = await hre.connect(signer, args.log)

    const details = await deployEngine(rmm, risky, stable)
    if (args.log) console.log(`Engine address: ${details.address}`)
    return { engine: details }
  })
