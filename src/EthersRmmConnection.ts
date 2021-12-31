import { Signer } from '@ethersproject/abstract-signer'

import { _connectToContracts, _RmmContractAddresses, _RmmContracts, _RmmDeploymentJSON } from './contracts'
import { EthersProvider, EthersSigner } from './types'

const deployments: { [chainId: number]: _RmmDeploymentJSON | undefined } = {
  [1]: undefined,
}

/**
 * Provides information on connection to Rmm protocol.
 *
 * @beta
 */
export interface EthersRmmConnection {
  /** Ethers provider to connect to the network. */
  readonly provider: EthersProvider

  /** Ethers Signer to send transactions to the network. */
  readonly signer: EthersSigner

  /** Connected chainId. */
  readonly chainId: number

  /** Date of Rmm protocol contracts deployment. */
  readonly deploymentDate: Date

  /** Block of contract deployments. */
  readonly startBlock: number

  /** Mapping of addresses to their names. */
  readonly addresses: Record<string, string>
}

/** @internal */
export interface _InternalEthersRmmConnection extends EthersRmmConnection {
  readonly addresses: _RmmContractAddresses
  readonly _contracts: _RmmContracts
  readonly _multicall?: any
}

export const connectionFrom = (
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  _contracts: _RmmContracts,
  { deploymentDate, ...deployment }: _RmmDeploymentJSON,
): _InternalEthersRmmConnection => {
  return { provider, signer, deploymentDate: new Date(deploymentDate), ...deployment } as _InternalEthersRmmConnection
}

const getProviderAndSigner = (
  signerOrProvider: EthersSigner | EthersProvider,
): [provider: EthersProvider, signer: EthersSigner | undefined] => {
  if (Signer.isSigner(signerOrProvider)) {
    if (!signerOrProvider?.provider) throw new Error('No provider')
    return [signerOrProvider.provider, signerOrProvider]
  } else {
    return [signerOrProvider, undefined]
  }
}

/** @internal */
export const _connectToDeployment = (
  deployment: _RmmDeploymentJSON,
  signerOrProvider: EthersSigner | EthersProvider,
): EthersRmmConnection =>
  connectionFrom(
    ...getProviderAndSigner(signerOrProvider),
    _connectToContracts(signerOrProvider, deployment),
    deployment,
  )

type EthersRmmStoreOption = 'default'

export interface EthersRmmConnectionOptional {
  /**
   * Creates a {@link RmmStore} returned by `store` property.
   *
   * @beta
   */
  readonly hasStore?: EthersRmmStoreOption
}

export function _connectToNetwork(
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  chainId: number,
): EthersRmmConnection {
  if (!deployments[chainId]) throw new Error(`No deployment found for chainId: ${chainId}`)

  const deployment: _RmmDeploymentJSON = deployments[chainId]
  return connectionFrom(provider, signer, _connectToContracts(signer ?? provider, deployment), deployment)
}

/** @internal */
export const _connect = async (signerOrProvider: EthersSigner | EthersProvider) => {
  const [provider, signer] = getProviderAndSigner(signerOrProvider)

  return _connectToNetwork(provider, signer, (await provider.getNetwork()).chainId)
}
