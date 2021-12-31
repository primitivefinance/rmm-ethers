import { Contract } from '@ethersproject/contracts'

import { EthersProvider, EthersSigner } from './types'

/** @internal */
export interface _RmmContracts {
  primitiveFactory: Contract
  primitiveManager: Contract
  positionRenderer: Contract
  positionDescriptor: Contract
}

/** @internal */
export const _RmmContractAbis = {
  primitiveFactory: [],
  primitiveManager: [],
  positionRenderer: [],
  positionDescriptor: [],
}

type RmmContractsKey = keyof _RmmContracts

/** @internal */
export type _RmmContractAddresses = Record<RmmContractsKey, string>

/** @internal */
export interface _RmmDeploymentJSON {
  readonly chainId: number
  readonly deploymentDate: number
  readonly startBlock: number
  readonly addresses: _RmmContractAddresses
}

const mapContracts = <T, U>(contracts: Record<RmmContractsKey, T>, f: (t: T, key: RmmContractsKey) => U) =>
  Object.fromEntries(Object.entries(contracts).map(([key, t]) => [key, f(t, key as RmmContractsKey)])) as Record<
    RmmContractsKey,
    U
  >

/** @internal */
export const _connectToContracts = (
  signerOrProvider: EthersSigner | EthersProvider,
  { addresses }: _RmmDeploymentJSON,
): _RmmContracts => {
  return mapContracts(
    addresses,
    (address, key) => new Contract(address, _RmmContractAbis[key], signerOrProvider),
  ) as _RmmContracts
}
