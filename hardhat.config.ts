import 'hardhat/types/runtime'
import { task, subtask, HardhatUserConfig, types, extendEnvironment, extendConfig } from 'hardhat/config'
import { HardhatConfig, HardhatRuntimeEnvironment, NetworkUserConfig } from 'hardhat/types'

import fs from 'fs'
import path, { resolve } from 'path'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: resolve(__dirname, './.env') })

import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-etherscan'
import 'hardhat-dependency-compiler'
import '@openzeppelin/hardhat-upgrades'

import { Signer } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'
import { Overrides } from '@ethersproject/contracts'

import { DefenderRelayProvider, DefenderRelaySigner } from 'defender-relay-client/lib/ethers'
import PositionRendererArtifact from '@primitivefi/rmm-manager/artifacts/contracts/PositionRenderer.sol/PositionRenderer.json'

import { _RmmDeploymentJSON, _connectToContracts } from './src/contracts'
import { deployAndSetupContracts, setSilent } from './utils/deploy'
import { EthersRmm } from './src'

// --- Env ---
const MNEMONIC = process.env.MNEMONIC || ''
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ''
const INFURA_API_KEY = process.env.INFURA_API_KEY || ''
//const ALCHEMY_KEY = process.env.ALCHEMY_KEY || ''

const {
  RELAY_KOVAN_SECRET,
  RELAY_KOVAN_API,
  RELAY_RINKEBY_SECRET,
  RELAY_RINKEBY_API,
  RELAY_GOERLI_API,
  RELAY_GOERLI_SECRET,
} = process.env

/* const {

  UNIVERSAL_RELAY_KOVAN_SECRET,
  UNIVERSAL_RELAY_KOVAN_API,
  UNIVERSAL_RELAY_RINKEBY_SECRET,
  UNIVERSAL_RELAY_RINKEBY_API,
} = process.env */

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

// --- Constants ---
const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 31337,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
}

const wethAddresses = {
  mainnet: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  ropsten: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
  rinkeby: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
  goerli: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
  kovan: '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
}

const hasWETH = (network: string): network is keyof typeof wethAddresses => network in wethAddresses

const getContractsVersion = () => {
  try {
    return fs.readFileSync(path.join('artifacts', 'version')).toString().trim()
  } catch (e) {
    return 'unknown'
  }
}

// -- Hardhat Environment --

export type Signers = Signer | DefenderRelaySigner

// - Config -

interface DefenderConfig {
  apiKey: string
  apiSecret: string
}

interface HardhatDefenderConfig {
  [chainId: number]: DefenderConfig | undefined
}

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    defender?: HardhatDefenderConfig
  }

  export interface HardhatConfig {
    defender?: HardhatDefenderConfig
  }
}

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  const networks = userConfig.defender ? Object.keys(userConfig?.defender).map(network => +network) : []
  const userDefender = userConfig.defender as HardhatDefenderConfig
  const userDefenderConfig = (chainId: number) => userDefender[chainId] as DefenderConfig

  if (networks.length > 0) {
    networks.forEach(chainId => {
      if (!userDefender || !userDefenderConfig(chainId).apiKey || !userDefenderConfig(chainId).apiSecret) {
        /* const sampleConfig = JSON.stringify(
          { defender: { [chainId]: { apiKey: 'YOUR_API_KEY', apiSecret: 'YOUR_API_SECRET' } } },
          null,
          2,
        ) */
        /* console.warn(
          `Defender API key and secret are not set. Add the following to your hardhat.config.ts exported configuration:\n\n${sampleConfig}\n`,
        ) */
      }
      if (typeof config.defender !== 'undefined') {
        const user = userConfig.defender ?? {}
        const hasKeys = user ? Object.entries(user) : undefined
        if (hasKeys) {
          config.defender = { ...config.defender, [chainId]: userDefender?.[chainId] as DefenderConfig }
        }
      } else {
        config.defender = {}
        config.defender = { ...config.defender, [chainId]: userDefender?.[chainId] as DefenderConfig }
      }
    })
  }
})

// - Runtime -

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    deployRmm: (deployer: Signers, wethAddress: string, overrides?: Overrides) => Promise<_RmmDeploymentJSON>
    connect: (signer: Signers) => Promise<EthersRmm>
  }
}

extendEnvironment((env: HardhatRuntimeEnvironment) => {
  env.deployRmm = async (deployer: Signers, wethAddress, overrides?: Overrides) => {
    const _isDev = env.network.name === 'dev'
    if (_isDev) setSilent(false)
    const deployment = await deployAndSetupContracts(
      deployer,
      _isDev,
      wethAddress,
      env.upgrades,
      new env.ethers.ContractFactory(PositionRendererArtifact.abi, PositionRendererArtifact.bytecode, deployer),
      overrides,
    )
    return { ...deployment, version: getContractsVersion() }
  }

  env.connect = async (signer: Signers) => {
    let rmm: EthersRmm
    try {
      rmm = await EthersRmm.connect(signer)
    } catch (e) {
      console.error(`Thrown on attempting to connect to RMM protocol`, e)
      throw new Error(`${e}`)
    }

    return rmm
  }
})

// -- Defender --

const DEFENDER_ERROR = `Missing Defender API key and secret in hardhat config`

const hasDefender = (hre: HardhatRuntimeEnvironment, chainId: number) =>
  (hre.config.defender as HardhatDefenderConfig)[chainId]

export function useRelayProvider(hre: HardhatRuntimeEnvironment, chainId: number) {
  if (typeof hasDefender(hre, chainId) === 'undefined') throw new Error(DEFENDER_ERROR)
  const config = (hre.config.defender as HardhatDefenderConfig)[chainId] as DefenderConfig
  return new DefenderRelayProvider(config)
}

export function useRelaySigner(hre: HardhatRuntimeEnvironment, chainId: number) {
  if (typeof hasDefender(hre, chainId) === 'undefined') throw new Error(DEFENDER_ERROR)
  const provider = useRelayProvider(hre, chainId)
  const config = (hre.config.defender as HardhatDefenderConfig)[chainId] as DefenderConfig
  return new DefenderRelaySigner(config, provider, {
    speed: 'fast',
  })
}

subtask('useSigner', 'use the default signer or one at the signers index')
  .addOptionalParam('i', 'signer index')
  .setAction(async (args, hre) => {
    const chainId = +(await hre.network.provider.send('eth_chainId'))
    const isDefenderNetwork = hasDefender(hre, chainId)

    let signer: any
    if (isDefenderNetwork) signer = useRelaySigner(hre, chainId)
    else if (args.i) signer = (await hre.ethers.getSigners())[args.i]
    else [signer] = await hre.ethers.getSigners()

    return signer
  })

// --- Deploy ---

type DeployParams = {
  defender: boolean
  channel: string
  gasPrice: number
  testweth?: string
}

const defaultChannel = process.env.CHANNEL || 'default'

task('deploy', 'Deploys the contracts to the network')
  .addFlag('defender', 'Use open zeppelin defender relay to deploy contracts.')
  .addOptionalParam('channel', 'Deployment channel to deploy info into', defaultChannel, types.string)
  .addOptionalParam('gasPrice', 'Price to pay for gas', undefined, types.float)
  .addOptionalParam('testweth', 'Only for testing! A test weth address', undefined, types.string)
  .setAction(async ({ defender, channel, gasPrice, testweth }: DeployParams, env) => {
    const chainId = +(await env.network.provider.send('eth_chainId'))
    const [deployer] =
      defender && hasDefender(env, chainId) ? [useRelaySigner(env, chainId)] : await env.ethers.getSigners()

    const overrides = { gasPrice: gasPrice && BigNumber.from(gasPrice).div(1000000000).toHexString() }

    const defaultTestWeth = '0x0000000000000000000000000000000000000001'
    const wethAddress: string | undefined =
      env.network.name === 'dev'
        ? testweth ?? defaultTestWeth
        : hasWETH(env.network.name)
        ? wethAddresses[env.network.name]
        : undefined // to-do: fix!

    if (typeof wethAddress === 'undefined') throw new Error('No weth address supplied')

    setSilent(false)

    console.log(` - Deploying from: ${await deployer.getAddress()}`)
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

const config = {
  defaultNetwork: 'hardhat',
  networks: {
    dev: {
      chainId: chainIds.ganache,
      url: 'http://127.0.0.1:8545',
      blockGasLimit: 12e6,
      gas: 12e6,
    },
    hardhat: {
      gas: 12e6, // tx gas limit
      blockGasLimit: 12e6,

      // Let Ethers throw instead of Hardhat EVM
      // This is closer to what will happen in production
      throwOnCallFailures: false,
      throwOnTransactionFailures: false,
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
        version: '0.8.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 400,
          },
        },
      },
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
    externalArtifacts: [
      'node_modules/@primitivefi/rmm-manager/artifacts/!(build-info)/!(test)/+([a-zA-Z0-9_]).json',
      'node_modules/@primitivefi/rmm-core/artifacts/!(build-info)/!(test)/+([a-zA-Z0-9_]).json',
    ],
  },
  defender: {
    /*  [4]: {
      apiKey: UNIVERSAL_RELAY_RINKEBY_API || '',
      apiSecret: UNIVERSAL_RELAY_RINKEBY_SECRET || '',
    },
    [42]: {
      apiKey: UNIVERSAL_RELAY_KOVAN_API || '',
      apiSecret: UNIVERSAL_RELAY_KOVAN_SECRET || '',
    }, */
    [chainIds.rinkeby]: {
      apiKey: RELAY_RINKEBY_API || '',
      apiSecret: RELAY_RINKEBY_SECRET || '',
    },
    [chainIds.goerli]: {
      apiKey: RELAY_GOERLI_API || '',
      apiSecret: RELAY_GOERLI_SECRET || '',
    },
    [chainIds.kovan]: {
      apiKey: RELAY_KOVAN_API || '',
      apiSecret: RELAY_KOVAN_SECRET || '',
    },
  },
  dependencyCompiler: {
    paths: [
      '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol',
      '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol',
    ],
  },
}

export default config
