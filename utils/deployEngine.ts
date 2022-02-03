import { Contract } from 'ethers'
import { AddressZero } from '@ethersproject/constants'
import { isAddress } from '@ethersproject/address'

import { PrimitiveEngine } from '../typechain/PrimitiveEngine'

import { log } from './deploy'
import { EngineCreationDetails, EthersRmm, _RmmContractAbis } from '../src'

export async function deployEngine(rmm: EthersRmm, risky: string, stable: string): Promise<PrimitiveEngine> {
  if (!isAddress(risky)) throw new Error(`Risky address is invalid, is it check summed?`)
  if (!isAddress(stable)) throw new Error(`Stable address is invalid, is it check summed?`)
  if (!rmm.connection.signer) throw new Error(`Signer on rmm connection is invalid`)

  const riskyCodeLength = await rmm.connection.signer.provider?.getCode(risky)
  if (riskyCodeLength === '0x') throw new Error(`No risky token deployed at address: ${risky}`)

  const stableCodeLength = await rmm.connection.signer.provider?.getCode(stable)
  if (stableCodeLength === '0x') throw new Error(`No stable token deployed at address: ${stable}`)

  let engineAddress: string = AddressZero

  try {
    engineAddress = await rmm.getEngine(risky, stable)
    log(`   Got engine at: ${engineAddress}`)
  } catch (e) {
    log(`   Caught when attempting to getEngine`)
  }

  if (engineAddress === AddressZero) {
    log(`     Deploying engine because fetched address is zero: ${engineAddress}`)
    let details: EngineCreationDetails | undefined = undefined
    try {
      details = await rmm.createEngine({ risky: risky, stable: stable })
    } catch (e) {
      log(`   Failed on attempting to createEngine`)
    }

    try {
      engineAddress = await rmm.getEngine(risky, stable)
    } catch (e) {}

    engineAddress = details?.engine ?? AddressZero
  }

  if (engineAddress === AddressZero) throw new Error('Zero address on engine, failed deployment?')
  const engine: PrimitiveEngine = new Contract(
    engineAddress,
    _RmmContractAbis.primitiveEngine,
    rmm.connection.signer,
  ) as PrimitiveEngine
  return engine
}
