import { LogDescription } from '@ethersproject/abi'
import { Contract, ContractInterface } from '@ethersproject/contracts'
import { Log } from '@ethersproject/abstract-provider'

import { PrimitiveManager } from '@primitivefi/rmm-manager/typechain/PrimitiveManager'
import { PositionRenderer } from '@primitivefi/rmm-manager/typechain/PositionRenderer'
import { PositionDescriptor } from '@primitivefi/rmm-manager/typechain/PositionDescriptor'
import { PrimitiveFactory } from '@primitivefi/rmm-core/typechain/PrimitiveFactory'

import { EthersProvider, EthersSigner } from './types'
import { BigNumber } from '@ethersproject/bignumber'
import {
  Engine,
  FactoryManager,
  PeripheryManager,
  PositionDescriptorManager,
  PositionRendererManager,
} from '@primitivefi/rmm-sdk'

/** @internal */
export interface _TypedLogDescription<T> extends Omit<LogDescription, 'args'> {
  args: T
}

/** @beta */
export class _RmmContract {
  readonly contract: Contract
  //readonly estimateAndPopulate: Record<string, EstimatedContractFunction<PopulatedTransaction>>

  constructor(
    addressOrName: string,
    contractInterface: ContractInterface,
    signerOrProvider?: EthersSigner | EthersProvider,
  ) {
    //super(addressOrName, contractInterface, signerOrProvider)
    this.contract = new Contract(addressOrName, contractInterface, signerOrProvider)
    //this.estimateAndPopulate = buildEstimatedFunctions(this.estimateGas, this.populateTransaction)
  }

  extractEvents(logs: Log[], name: string): _TypedLogDescription<unknown>[] {
    return logs
      .filter(log => log.address === this.contract.address)
      .map(log => this.contract.interface.parseLog(log))
      .filter(e => e.name === name)
  }
}

/** @internal */
export type _TypedRmmContract<T = unknown, U = unknown> = TypedContract<_RmmContract, T, U>

type BucketOfFunctions = Record<string, (...args: unknown[]) => never>

/** @internal */
export type _TypeSafeContract<T> = Pick<
  T,
  {
    [P in keyof T]: BucketOfFunctions extends T[P] ? never : P
  } extends {
    [_ in keyof T]: infer U
  }
    ? U
    : never
>

type TypedContract<T, U, V> = _TypeSafeContract<T> & U & unknown

interface ManagerContract extends _TypedRmmContract<PrimitiveManager> {
  extractEvents(
    logs: Log[],
    name: 'Allocate',
  ): _TypedLogDescription<{
    payer: string
    engine: string
    poolId: string
    delLiquidity: BigNumber
    delRisky: BigNumber
    delStable: BigNumber
    fromMargin: boolean
  }>[]
  extractEvents(
    logs: Log[],
    name: 'Remove',
  ): _TypedLogDescription<{
    payer: string
    engine: string
    poolId: string
    delLiquidity: BigNumber
    delRisky: BigNumber
    delStable: BigNumber
  }>[]
  extractEvents(logs: Log[], name: 'Create'): _TypedLogDescription<{ poolId: string }>[]
}

interface FactoryContract extends _TypedRmmContract<PrimitiveFactory> {
  extractEvents(logs: Log[], name: 'DeployedEngine'): _TypedLogDescription<{ engine: string }>[]
}

type PositionRendererContract = _TypedRmmContract<PositionRenderer>
type PositionDescriptorContract = _TypedRmmContract<PositionDescriptor>

/** @internal */
export interface _RmmContracts {
  primitiveFactory: FactoryContract
  primitiveManager: ManagerContract
  positionRenderer: PositionRendererContract
  positionDescriptor: PositionDescriptorContract
}

/** @internal */
export const _RmmContractAbis = {
  primitiveFactory: FactoryManager.ABI,
  primitiveManager: PeripheryManager.ABI,
  positionRenderer: PositionRendererManager.ABI,
  positionDescriptor: PositionDescriptorManager.ABI,
  primitiveEngine: Engine.ABI,
}

type RmmContractsKey = keyof _RmmContracts

/** @internal */
export type _RmmContractAddresses = Record<RmmContractsKey, string>

/** @internal */
export interface _RmmDeploymentJSON {
  readonly addresses: _RmmContractAddresses
  readonly chainId: number
  readonly deploymentDate: number
  readonly startBlock: number
  readonly version: string
  readonly _isDev: boolean
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
    (address, key) => new _RmmContract(address, _RmmContractAbis[key], signerOrProvider) as _TypedRmmContract,
  ) as _RmmContracts
}
