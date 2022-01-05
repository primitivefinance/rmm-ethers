import { Signer } from '@ethersproject/abstract-signer'
import { ContractTransaction, ContractFactory, Overrides } from '@ethersproject/contracts'
import { Wallet } from '@ethersproject/wallet'
import {
  FactoryManager,
  PeripheryManager,
  PositionDescriptorManager,
  PositionRendererManager,
} from '@primitivefi/rmm-sdk'
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
  wethAddress: string,
  overrides?: Overrides,
): Promise<[addresses: _RmmContractAddresses, startBlock: number]> => {
  const [primitiveFactory, startBlock] = await deployContractAndGetBlockNumber(
    deployer,
    async (_, signer) => FactoryManager.getFactory(signer),
    'PrimitiveFactory',
    { ...overrides },
  )
  const positionRenderer = await deployContract(
    deployer,
    async (_, signer) => PositionRendererManager.getFactory(signer),
    'PositionRenderer',
    {
      ...overrides,
    },
  )
  const descriptorArgs = [positionRenderer]
  const positionDescriptor = await deployContract(
    deployer,
    async (_, signer) => PositionDescriptorManager.getFactory(signer),
    'PositionDescriptor',
    ...descriptorArgs,
    {
      ...overrides,
    },
  )
  const managerArgs = [primitiveFactory, wethAddress, positionDescriptor]
  const primitiveManager = await deployContract(
    deployer,
    async (_, signer) => PeripheryManager.getFactory(signer),
    'PrimitiveManager',
    ...managerArgs,
    {
      ...overrides,
    },
  )

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
  wethAddress: string,
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

    ...(await deployContracts(deployer, getContractFactory, wethAddress, overrides).then(
      async ([addresses, startBlock]) => ({
        startBlock,

        addresses: {
          ...addresses,
        },
      }),
    )),
  }

  return {
    ...deployment,
  }
}
