import fs from 'fs'
import path from 'path'
import hre from 'hardhat'
import { MaxUint256, AddressZero } from '@ethersproject/constants'
import { parsePercentage, parseWei, Time } from 'web3-units'
import { Signer } from '@ethersproject/abstract-signer'
import { DefenderRelaySigner } from 'defender-relay-client/lib/ethers'
import { Contract } from 'ethers'
import { EthersRmm, _RmmContractAbis } from '../src'
import { AllocateOptions, Pool } from '@primitivefi/rmm-sdk'
import TestERC20Artifact from '../artifacts/contracts/TestERC20.sol/TestERC20.json'
import USDCArtifact from '../artifacts/contracts/USDC.sol/USDC.json'
import { getAddress } from 'ethers/lib/utils'

export const VECRV_POOLS = {
  name: 'veCRV',
  spot: 6,
  pools: [
    { strike: 5, sigma: 1 },
    { strike: 10, sigma: 1.25 },
    { strike: 25, sigma: 1.5 },
  ],
}

interface IAggregatedPools {
  vecrv: typeof VECRV_POOLS
}

export const AGGREGATED_POOLS: IAggregatedPools = {
  vecrv: VECRV_POOLS,
}

type Signers = Signer | DefenderRelaySigner

type TokenLike = { address: string; decimals: number; name: string; symbol: string }
type PoolId = string

interface IPoolDeploymentsJSON {
  name: string
  risky: TokenLike
  stable: TokenLike
  pools: PoolId[]
}

export function getEngineSymbol(symbols: string[], strike: number, sigma: number, maturity: number): string {
  const name = `RMM-LP-${symbols[0]}/${symbols[1]}-${strike}-${sigma}-${maturity}`
  return name
}

const getTokenMetadata = async (contract: Contract): Promise<[number, string, string]> => {
  return await Promise.all([contract.decimals(), contract.name(), contract.symbol()])
}

type ConfigPoolKeys = keyof IAggregatedPools

async function getPoolTokensFromDeployment(
  name: ConfigPoolKeys,
  chainId: number,
): Promise<[TokenLike | undefined, TokenLike | undefined]> {
  const savePath = path.join('./deployments', 'default', 'pools.json')
  const data = (await readLog(chainId, name, savePath)) as IPoolDeploymentsJSON
  return [data?.risky, data?.stable]
}

type CalibrationType = { strike: string; sigma: string; maturity: string; gamma: string }

export async function getEngineOrDeployEngine(
  rmm: EthersRmm,
  riskyToken: Contract,
  stableToken: Contract,
): Promise<Contract> {
  let engineAddress = await rmm.getEngine(riskyToken.address, stableToken.address)
  if (engineAddress === AddressZero) {
    const details = await rmm.createEngine({ risky: riskyToken.address, stable: stableToken.address })
    engineAddress = details?.engine ?? (await rmm.getEngine(riskyToken.address, stableToken.address))
  }
  let engine: Contract = new Contract(engineAddress, _RmmContractAbis.primitiveEngine, rmm.connection.signer)
  return engine
}

const fn = async () => {
  const chainId = +(await hre.network.provider.send('eth_chainId'))
  console.log(`Using chainId: ${chainId}`)

  const signer: Signers = await hre.run('useSigner')
  const from = getAddress(await signer.getAddress())

  const rmm = await EthersRmm.connect(signer)
  console.log(`Connected to RMM: `, rmm.connection.addresses)

  const Erc20Factory = await hre.ethers.getContractFactory('TestERC20', signer)

  const [veCRVLike, usdcLike] = await getPoolTokensFromDeployment('vecrv', chainId)

  let veCRV: Contract
  if (veCRVLike?.address) veCRV = new Contract(veCRVLike.address, TestERC20Artifact.abi, signer)
  else {
    veCRV = await Erc20Factory.deploy('Test Vote Escrow Curve', 'veCRV')
    await veCRV.deployed()
  }

  let USDC: Contract
  if (usdcLike?.address) USDC = new Contract(usdcLike.address, USDCArtifact.abi, signer)
  else {
    USDC = await (await hre.ethers.getContractFactory('USDC', signer)).deploy('Test USD Coin', 'USDC', 6)
    await USDC.deployed()
  }

  const pairs = [[veCRV, USDC]]

  for (const [riskyToken, stableToken] of pairs) {
    const rMetadata = await getTokenMetadata(riskyToken)
    const sMetadata = await getTokenMetadata(stableToken)
    console.log(`Creating pools for the pair: ${rMetadata[2]}/${sMetadata[2]}`)

    const risky = { address: riskyToken.address, decimals: rMetadata[0], name: rMetadata[1], symbol: rMetadata[2] }
    const stable = { address: stableToken.address, decimals: sMetadata[0], name: sMetadata[1], symbol: sMetadata[2] }

    // Get engine, or deploy an engine

    let engine: Contract = await getEngineOrDeployEngine(rmm, riskyToken, stableToken)
    console.log(`Got engine or deployed engine: ${engine.address}`)

    // get default parameters
    const minRisky = parseWei('1000', risky.decimals)
    const minStable = parseWei('10000', stable.decimals)
    const now = Time.now
    const maturity = new Time(1649812284)
    const delLiquidity = parseWei(100)
    const item = VECRV_POOLS
    const poolsFromConfig = item.pools
    const referencePrice = item.spot

    // if testnet, sync with current timestamp
    if (chainId === 1337) await hre.network.provider.send('evm_mine', [now])

    // get params
    let poolEntities: Pool[] = []

    const allPools: CalibrationType[] = []
    poolsFromConfig.forEach(({ strike, sigma }) => {
      const gamma = 0.99
      const calibration: CalibrationType = {
        strike: parseWei(strike, stable.decimals).toString(),
        sigma: parsePercentage(sigma).toString(),
        maturity: maturity.raw.toString(),
        gamma: parsePercentage(gamma).toString(),
      }

      const pool: Pool = Pool.fromReferencePrice(
        referencePrice,
        rmm.connection.addresses.primitiveFactory,
        risky,
        stable,
        calibration,
        chainId,
        delLiquidity.toString(),
      )
      allPools.push(calibration)
      poolEntities.push(pool)
    })

    console.log(`   Got all pools: ${poolEntities.length}`)

    const managerAddress = getAddress(rmm.connection.addresses.primitiveManager)
    const riskyBalance = await riskyToken.balanceOf(from)
    const stableBalance = await stableToken.balanceOf(from)
    const riskyAllowance = await riskyToken.allowance(from, managerAddress)
    const stableAllowance = await stableToken.allowance(from, managerAddress)

    // approve max uint if lower than min amounts
    if (minRisky.gt(riskyAllowance)) await riskyToken.approve(managerAddress, MaxUint256)
    if (minStable.gt(stableAllowance)) await stableToken.approve(managerAddress, MaxUint256)

    console.log('   Creating pools')
    const symbols = [rMetadata[2], sMetadata[2]]

    const allPoolIds: PoolId[] = []
    for (let i = 0; i < poolEntities.length; i++) {
      // mint test tokens if our balance gets low
      if (minRisky.gt(riskyBalance)) await riskyToken.mint(from, minRisky.raw)
      if (minStable.gt(stableBalance)) await stableToken.mint(from, minStable.raw)

      const pool = poolEntities[i]
      const options: AllocateOptions = {
        recipient: from,
        slippageTolerance: parsePercentage(0.01),
        createPool: true,
        fromMargin: false,
        delRisky: pool.reserveRisky,
        delStable: pool.reserveStable.add(1),
        delLiquidity: pool.liquidity,
      }

      const name = getEngineSymbol(symbols, pool.strike.float, pool.sigma.float, pool.maturity.years)
      const poolDeployment: IPoolDeploymentsJSON = {
        name,
        risky,
        stable,
        pools: allPoolIds,
      }
      const savePath = path.join('./deployments', 'default', 'pools.json')
      const data = (await readLog(chainId, poolDeployment.name, savePath)) as IPoolDeploymentsJSON
      console.log(`Got log for: ${data?.name}`)

      if (!data?.name) {
        console.log(
          'Creating pool with options:',
          Object.keys(options).map((key: string) => [key, options?.[key as keyof AllocateOptions]?.toString()]),
        )

        const {
          newPosition: {
            pool: { poolId },
          },
        } = await rmm.createPool({
          pool,
          options,
        })

        allPoolIds.push(poolId as PoolId)

        await updateLog(chainId, poolDeployment.name, poolDeployment, savePath)
      }
    }
  }
}

async function main() {
  await fn()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

export async function updateLog(chainId: number, contractName: string, data: IPoolDeploymentsJSON, path?: string) {
  try {
    const logRaw = await fs.promises.readFile(path ? path : './deployments/default/pools.json', {
      encoding: 'utf-8',
      flag: 'a+',
    })
    let log

    if (logRaw.length === 0) {
      log = {}
    } else {
      log = JSON.parse(logRaw)
    }

    if (!log[chainId]) {
      log[chainId] = {}
    }

    log[chainId][contractName] = data

    await fs.promises.writeFile(path ? path : './deployments/default/pools.json', JSON.stringify(log, null, 2))
  } catch (e) {
    console.error(e)
  }
}

export async function readLog(
  chainId: number,
  contractName: string,
  path?: string,
): Promise<IPoolDeploymentsJSON | unknown> {
  try {
    const logRaw = await fs.promises.readFile(path ? path : './deployments/default/pools.json', {
      encoding: 'utf-8',
      flag: 'a+',
    })
    let log

    if (logRaw.length === 0) {
      log = {}
    } else {
      log = JSON.parse(logRaw)
    }

    if (!log[chainId]) {
      log[chainId] = {}
    }

    return log[chainId][contractName] as IPoolDeploymentsJSON
  } catch (e) {
    console.error(e)
    return e
  }
}
