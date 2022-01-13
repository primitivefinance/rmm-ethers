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

  let engineAddress: string = AddressZero

  try {
    engineAddress = await rmm.getEngine(risky, stable)
  } catch (e) {}

  if (engineAddress === AddressZero) {
    log('     Deploying engine!')
    let details: EngineCreationDetails | undefined = undefined
    try {
      details = await rmm.createEngine({ risky: risky, stable: stable })
    } catch (e) {}

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
