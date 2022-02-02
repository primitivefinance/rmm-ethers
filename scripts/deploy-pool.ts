import hre from 'hardhat'
import { Signer } from '@ethersproject/abstract-signer'
import { DefenderRelaySigner } from 'defender-relay-client/lib/ethers'

import { log, setSilent } from '../utils/deploy'
import { deployEngine } from '../utils/deployEngine'
import { AllocateOptions, Pool } from '@primitivefi/rmm-sdk'
import { parsePercentage, parseWei, Time } from 'web3-units'
import { deployPool } from '../utils/deployPool'
import { Ether } from '@uniswap/sdk-core'
import { Contract, constants } from 'ethers'
const { MaxUint256 } = constants

type Signers = Signer | DefenderRelaySigner

export async function main() {
  setSilent(false)

  const signer: Signers = await hre.run('useSigner')
  const from = await signer.getAddress()
  log(`Using signer: ${from}`)

  const rmm = await hre.connect(signer)

  log(`Connected to RMM: `, rmm.connection.addresses)

  const chainId = rmm.connection.chainId
  log(`Using chainId: ${chainId}`)

  if (chainId === 1) throw new Error('Do not use this in prod!')

  const ETH = Ether.onChain(chainId)

  const riskyAddress = ETH.wrapped.address // rinkeby:WETH: FIX
  const stableAddress = '0x522064c1EafFEd8617BE64137f66A71D6C5c9aA3' // rinkeby:USDC: FIX
  try {
    await deployEngine(rmm, riskyAddress, stableAddress)
  } catch (e) {}

  const risky = {
    address: riskyAddress,
    decimals: 18,
    name: 'Test Weth',
    symbol: 'WETH',
  }
  const stable = {
    address: stableAddress,
    decimals: 6,
    name: 'Test USDC',
    symbol: 'USDC',
  }

  const calibration = {
    strike: parseWei(2750, 6).toString(),
    sigma: parsePercentage(1.25).toString(),
    maturity: new Time(1644984438).toString(),
    gamma: parsePercentage(0.99).toString(),
  }

  const delLiquidity = parseWei(0.1)

  const abi = ['function approve(address,uint256)', 'function deposit()', 'function mint(address,uint256)']

  const WethContract = new Contract(riskyAddress, abi, signer)
  const USDCContract = new Contract(stableAddress, abi, signer)

  const pool: Pool = Pool.fromReferencePrice(
    2750,
    rmm.connection.addresses.primitiveFactory,
    risky,
    stable,
    calibration,
    chainId,
    delLiquidity.toString(),
  )

  const options: AllocateOptions = {
    recipient: from,
    slippageTolerance: parsePercentage(0.01),
    createPool: true,
    fromMargin: false,
    delRisky: pool.reserveRisky.add(1),
    delStable: pool.reserveStable.add(1),
    delLiquidity: pool.liquidity,
    useNative: ETH,
  }

  try {
    await USDCContract.mint(from, parseWei(100000, stable.decimals))
    await USDCContract.approve(rmm.connection.addresses.primitiveManager, MaxUint256)
  } catch (e) {}

  try {
    const details = await deployPool(rmm, pool, options)
    log(`Deploy pooled: ${details}`)
  } catch (e) {
    console.log(e)
  }

  console.log(ETH.wrapped.address, stableAddress)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
