import { Signer } from '@ethersproject/abstract-signer'
import { ContractTransaction, ContractFactory, Overrides } from '@ethersproject/contracts'
import { Wallet } from '@ethersproject/wallet'

import { _RmmContractAddresses, _RmmContracts, _RmmDeploymentJSON, _connectToContracts } from '../src/contracts'

let silent = true

export const log = (...args: unknown[]): void => {
  if (!silent) {
    console.log(...args)
  }
}

export const setSilent = (s: boolean): void => {
  silent = s
}

const deployContractAndGetBlockNumber = async (
  deployer: Signer,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  contractName: string,
  ...args: unknown[]
): Promise<[address: string, blockNumber: number]> => {
  log(`Deploying ${contractName} ...`)
  const contract = await (await getContractFactory(contractName, deployer)).deploy(...args)

  log(`Waiting for transaction ${contract.deployTransaction.hash} ...`)
  const receipt = await contract.deployTransaction.wait()

  log({
    contractAddress: contract.address,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toNumber(),
  })

  log()

  return [contract.address, receipt.blockNumber]
}

const deployContract: (...p: Parameters<typeof deployContractAndGetBlockNumber>) => Promise<string> = (...p) =>
  deployContractAndGetBlockNumber(...p).then(([a]) => a)

const deployContracts = async (
  deployer: Signer,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  overrides?: Overrides,
): Promise<[addresses: _RmmContractAddresses, startBlock: number]> => {
  const [primitiveFactory, startBlock] = await deployContractAndGetBlockNumber(
    deployer,
    getContractFactory,
    'PrimitiveFactory',
    { ...overrides },
  )
  const positionRenderer = await deployContract(deployer, getContractFactory, 'PositionRenderer', {
    ...overrides,
  })
  const descriptorArgs = [positionRenderer]
  const positionDescriptor = await deployContract(
    deployer,
    getContractFactory,
    'PositionDescriptor',
    ...descriptorArgs,
    {
      ...overrides,
    },
  )
  const managerArgs = [primitiveFactory, positionDescriptor]
  const primitiveManager = await deployContract(deployer, getContractFactory, 'PrimitiveManager', ...managerArgs, {
    ...overrides,
  })

  const addresses = {
    primitiveFactory: primitiveFactory,
    positionRenderer: positionRenderer,
    positionDescriptor: positionDescriptor,
    primitiveManager: primitiveManager,
  }

  return [addresses, startBlock]
}

export const deployAndSetupContracts = async (
  deployer: Signer,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  _isDev = true,
  wethAddress?: string,
  overrides?: Overrides,
): Promise<_RmmDeploymentJSON> => {
  if (!deployer.provider) {
    throw new Error('Signer must have a provider.')
  }

  log('Deploying contracts...')
  log()

  const deployment: _RmmDeploymentJSON = {
    chainId: await deployer.getChainId(),
    version: 'unknown',
    deploymentDate: new Date().getTime(),
    _isDev,

    ...(await deployContracts(deployer, getContractFactory, overrides).then(async ([addresses, startBlock]) => ({
      startBlock,

      addresses: {
        ...addresses,
      },
    }))),
  }

  return {
    ...deployment,
  }
}
