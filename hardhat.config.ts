import { task, HardhatUserConfig, types, extendEnvironment, extendConfig } from 'hardhat/config'
import { Artifact, FactoryOptions, HardhatConfig, HardhatRuntimeEnvironment, NetworkUserConfig } from 'hardhat/types'
import { lazyObject } from 'hardhat/plugins'
import { Artifacts } from 'hardhat/internal/artifacts'

import { config as dotenvConfig } from 'dotenv'
import path, { resolve } from 'path'
import fs from 'fs'
dotenvConfig({ path: resolve(__dirname, './.env') })

import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'

import 'hardhat-gas-reporter'
import '@nomiclabs/hardhat-etherscan'

import { Signer } from '@ethersproject/abstract-signer'
import { ContractFactory, Overrides } from '@ethersproject/contracts'

import 'hardhat/types/runtime'
import { _RmmDeploymentJSON, _connectToContracts } from './src/contracts'
import { deployAndSetupContracts, setSilent } from './utils/deploy'
import { BigNumber } from 'ethers'
import { artifacts } from 'hardhat'

const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 31337,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
}

const MNEMONIC = process.env.MNEMONIC || ''
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ''
const INFURA_API_KEY = process.env.INFURA_API_KEY || ''
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || ''

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (args, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(await account.getAddress())
  }
})

function createTestnetConfig(network: keyof typeof chainIds): NetworkUserConfig {
  const url: string = 'https://' + network + '.infura.io/v3/' + INFURA_API_KEY
  return {
    accounts: {
      count: 10,
      initialIndex: 0,
      mnemonic: MNEMONIC,
      path: "m/44'/60'/0'/0",
    },
    chainId: chainIds[network],
    url,
  }
}

const wethAddresses = {
  mainnet: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  ropsten: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
  rinkeby: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
  goerli: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
  kovan: '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
}

const hasWETH = (network: string): network is keyof typeof wethAddresses => network in wethAddresses

// --- Env ---
const useLiveVersionEnv = (process.env.USE_LIVE_VERSION ?? 'false').toLowerCase()
const useLiveVersion = !['false', 'no', '0'].includes(useLiveVersionEnv)

// --- Deploy ---

// -- Helpers --

const getLiveArtifact = (name: string) => {
  return { abi: [], bytecode: '' }
}

const getContractFactory: (
  env: HardhatRuntimeEnvironment,
) => (name: string, signer: Signer) => Promise<ContractFactory> = useLiveVersion
  ? env => (name, signer) => {
      const { abi, bytecode } = getLiveArtifact(name)
      return env.ethers.getContractFactory(abi, bytecode, signer)
    }
  : env => env.ethers.getContractFactory

export const getExternalArtifacts: (env: HardhatRuntimeEnvironment) => { artifacts: string }[] = env =>
  env?.config?.external?.contracts ?? []

// -- Hardhat Environment --

function normalizePath(config: HardhatConfig, userPath: string | undefined, defaultPath: string): string {
  if (userPath === undefined) {
    userPath = path.join(config.paths.root, defaultPath)
  } else {
    if (!path.isAbsolute(userPath)) {
      userPath = path.normalize(path.join(config.paths.root, userPath))
    }
  }
  return userPath
}

function normalizePathArray(config: HardhatConfig, paths: string[]): string[] {
  const newArray: string[] = []
  for (const value of paths) {
    if (value) {
      newArray.push(normalizePath(config, value, value))
    }
  }
  return newArray
}

const contractsVersion = 'beta.4'

declare module 'hardhat/types/config' {
  interface HardhatUserConfig {
    external?: {
      deployments?: {
        [networkName: string]: string[]
      }
      contracts?: {
        artifacts: string
      }[]
    }
  }

  interface HardhatConfig {
    external?: {
      deployments?: {
        [networkName: string]: string[]
      }
      contracts?: {
        artifacts: string
      }[]
    }
  }
}

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  if (userConfig.external) {
    if (!config.external) {
      config.external = {}
    }
    if (userConfig.external.contracts) {
      const externalContracts: { artifacts: string }[] = []
      config.external.contracts = externalContracts
      for (const userDefinedExternalContracts of userConfig.external.contracts) {
        externalContracts.push({
          artifacts: normalizePath(
            config,
            userDefinedExternalContracts.artifacts,
            userDefinedExternalContracts.artifacts,
          ),
        })
      }
    }
    if (userConfig.external.deployments) {
      config.external.deployments = {}
      for (const key of Object.keys(userConfig.external.deployments)) {
        config.external.deployments[key] = normalizePathArray(config, userConfig.external.deployments[key])
      }
    }
  }
})

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    deployRmm: (deployer: Signer, wethAddress: string, overrides?: Overrides) => Promise<_RmmDeploymentJSON>
  }
}

extendEnvironment((env: HardhatRuntimeEnvironment) => {
  env.deployRmm = async (deployer: Signer, wethAddress, overrides?: Overrides) => {
    const deployment = await deployAndSetupContracts(
      deployer,
      getContractFactory(env),
      env.network.name === 'dev',
      wethAddress,
      overrides,
    )

    return { ...deployment, version: contractsVersion }
  }
})

// -- Task --

const defaultChannel = 'default'

type DeployParams = {
  channel: string
  gasPrice: number
}

task('deploy', 'Deploys the contracts to the network')
  .addOptionalParam('channel', 'Deployment channel to deploy info into', defaultChannel, types.string)
  .addOptionalParam('gasPrice', 'Price to pay for gas', undefined, types.float)
  .setAction(async ({ channel, gasPrice }: DeployParams, env) => {
    const [deployer] = await env.ethers.getSigners()
    const overrides = { gasPrice: gasPrice && BigNumber.from(gasPrice).div(1000000000).toHexString() }

    let wethAddress: string | undefined = undefined
    wethAddress = hasWETH(env.network.name) ? wethAddresses[env.network.name] : undefined // to-do: fix!
    if (typeof wethAddress === 'undefined') throw new Error('No weth address supplied')

    setSilent(false)

    const deployment = await env.deployRmm(deployer, wethAddress, overrides)

    fs.mkdirSync(path.join('deployments', channel), { recursive: true })

    fs.writeFileSync(
      path.join('deployments', channel, `${env.network.name}.json`),
      JSON.stringify(deployment, undefined, 2),
    )

    console.log()
    console.log(deployment)
    console.log()
  })

// --- End Deploy ---

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: chainIds.hardhat,
    },
    mainnet: createTestnetConfig('mainnet'),
    goerli: createTestnetConfig('goerli'),
    kovan: createTestnetConfig('kovan'),
    rinkeby: createTestnetConfig('rinkeby'),
    ropsten: createTestnetConfig('ropsten'),
  },
  solidity: {
    compilers: [
      {
        version: '0.6.12',
      },
      {
        version: '0.6.6',
      },
    ],
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 100,
    // enabled: process.env.REPORT_GAS ? true : false,
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  external: {
    contracts: [
      {
        artifacts: 'node_modules/@primitivefi/rmm-core/artifacts',
      },
      {
        artifacts: 'node_modules/@primitivefi/rmm-manager/artifacts',
      },
    ],
  },
}

export default config
