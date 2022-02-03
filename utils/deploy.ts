import { Signer } from '@ethersproject/abstract-signer'
import { ContractFactory, Overrides } from '@ethersproject/contracts'
import {
  FactoryManager,
  PeripheryManager,
  PositionDescriptorManager,
  PositionRendererManager,
} from '@primitivefi/rmm-sdk'
import { _RmmContractAddresses, _RmmContracts, _RmmDeploymentJSON, _connectToContracts } from '../src/contracts'
import ProxyAdmin from '@openzeppelin/contracts/build/contracts/ProxyAdmin.json'
import TransparentUpgradeableProxy from '@openzeppelin/contracts/build/contracts/TransparentUpgradeableProxy.json'

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
  const factory = await getContractFactory(contractName, deployer)
  log(`Deploying ${contractName} ...`)
  const contract = await factory.deploy(...args)

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

const deployUpgradableContract = async (
  target: string,
  signer: Signer,
  contractName: string,
  ...args: unknown[]
): Promise<{ admin: string; upgradeableProxy: string }> => {
  log(`Deploying Proxy Admin for ${contractName} ...`)
  const proxyAdminFac = new ContractFactory(ProxyAdmin.abi, ProxyAdmin.bytecode, signer)
  const upgradableFac = new ContractFactory(
    TransparentUpgradeableProxy.abi,
    TransparentUpgradeableProxy.bytecode,
    signer,
  )

  const proxyAdmin = await proxyAdminFac.deploy()
  log(`Waiting for transaction ${proxyAdmin.deployTransaction.hash} ...`)
  let receipt = await proxyAdmin.deployTransaction.wait()

  log(`Deploying Upgradeable Proxy for ${contractName} ...`)
  const upgradable = await upgradableFac.deploy(target, proxyAdmin.address, '0x')
  log(`Waiting for transaction ${upgradable.deployTransaction.hash} ...`)
  receipt = await upgradable.deployTransaction.wait()

  log({
    contractAddress: target,
    proxyAdmin: proxyAdmin.address,
    upgradeableProxy: upgradable.address,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toNumber(),
  })

  log()

  return { admin: proxyAdmin.address, upgradeableProxy: upgradable.address }
}

const deployContract: (...p: Parameters<typeof deployContractAndGetBlockNumber>) => Promise<string> = (...p) =>
  deployContractAndGetBlockNumber(...p).then(([a]) => a)

const deployContracts = async (
  deployer: Signer,
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

  const { admin, upgradeableProxy } = await deployUpgradableContract(positionRenderer, deployer, 'PositionRenderer')

  const descriptorArgs = [upgradeableProxy]
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
    positionRendererProxyAdmin: admin,
    positionRendererTransparentUpgradeableProxy: upgradeableProxy,
  }

  return [addresses, startBlock]
}

export const deployAndSetupContracts = async (
  deployer: Signer,
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

    ...(await deployContracts(deployer, wethAddress, overrides).then(async ([addresses, startBlock]) => ({
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
