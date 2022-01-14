# 🍄 rmm-ethers

![version](https://img.shields.io/npm/v/@primitivefi/rmm-ethers) ![npm](https://img.shields.io/npm/dt/@primitivefi/rmm-ethers) ![license](https://img.shields.io/npm/l/@primitivefi/rmm-ethers) ![stars](https://img.shields.io/github/stars/primitivefinance/rmm-ethers?style=social&color=%23FFB31A)

> Easily connect and transact with RMM protocol.

---

## 🧩 Features

- 🌲 Deploy RMM protocol
- ⚡️ Easily connect to an RMM deployment
- 🌊 Create RMM pools
- ☄️ Allocate or remove liquidity
- 🎁 Transfer positions
- 🔭 Read protocol data

---

> This software is in Alpha.

## 📦 Installation

Installing locally:

```
# Clone the repository
git clone https://github.com/primitivefinance/rmm-ethers.git

# Install dependencies
yarn install
```

Installing as a package:

```
# Using yarn
yarn add @primitivefi/rmm-ethers

# Or using npm
npm i @primitivefi/rmm-ethers
```

Use it by connecting with a signer or provider:

```
# Import the EthersRmm class
import { EthersRmm } from '@primitivefi/rmm-ethers'

# Use the class by connecting to a deployment
await EthersRmm.connect(signerOrProvider)
```

## ✏️ Usage as a Package

### 🪝 As a react hook:

Here is an example of a React hook that makes use of web3-react and SWR:

```
import useSWR, { SWRResponse } from 'swr'
import {useWeb3React} from 'web3-react'
import { Signer } from '@ethersproject/abstract-signer'
import { EthersRmm } from '@primitivefi/rmm-ethers'

function getEthersRmm(signerOrProvider: Signer | Provider): () => Promise<EthersRmm> {
  return async () => await EthersRmm.connect(signerOrProvider)
}

/**
 * Connects to EthersRmm deployment from the connected provider or signer.
 */
export function useRmmProtocol(suspense = false): SWRResponse<EthersRmm, Error> {
  const { library: signerOrProvider, chainId } = useWeb3React()
  const shouldFetch = !!signerOrProvider && typeof chainId !== 'undefined'
  const result = useSWR(
    shouldFetch ? [signerOrProvider, 'ethers-rmm', chainId] : null,
    getEthersRmm(signerOrProvider?.getSigner() as Signer),
    {
      dedupingInterval: 60 * 1000,
      refreshInterval: 60 * 1000,
      suspense,
    }
  )

  return result
}
```

### 🌊 Fetch a pool

```
import { Pool } from '@primitivefi/rmm-sdk'
import { EthersRmm, Position } from '@primitivefi/rmm-ethers'

async function getPool(poolId: string): Promise<Pool> {
  return rmm.getPool(poolId).then((data) => data)
}
```

### ⚱️ Fetching pool liquidity positions

```
import { Pool } from '@primitivefi/rmm-sdk'
import { EthersRmm, Position } from '@primitivefi/rmm-ethers'

async function getPoolPosition(pool: Pool, account: string): Promise<Position> {
  return rmm.getPosition(pool, account).then((data) => data)
}
```

## Adjusting Positions

When allocating or removing liquidity, the arguments must match the respective interfaces, which live in the rmm-sdk:

```
/** Flag to use a native currency in a transaction.  */
export interface NativeOptions {
  useNative?: NativeCurrency
}

/** Recipient address of any tokens which are output from transactions. */
export interface RecipientOptions {
  recipient: string
}

/** Timestamp which will revert the transaction if not yet mined. */
export interface Deadline {
  deadline?: BigNumber
}

/** Permit details on either risky or stable tokens. */
export interface PermitTokens {
  /** If defined, risky token can be permitted, saving the user an approve tx. */
  permitRisky?: PermitOptions

  /** If defined, stable token can be permitted, saving the user an approve tx. */
  permitStable?: PermitOptions
}

/** Token amounts to use for depositing or withdrawing into a margin account.  */
export interface MarginOptions extends PermitTokens, RecipientOptions, NativeOptions {
  amountRisky: Wei
  amountStable: Wei
}

/** Token amounts to use for allocating liquidity. */
export interface LiquidityOptions {
  /** Amount of risky tokens to provide as liquidity. */
  delRisky: Wei
  /** Amount of stable tokens to provide as Liquidity. */
  delStable: Wei
  /** Desired liquidity to mint. */
  delLiquidity: Wei
}

/**
 * Provide liquidity argument details.
 *
 * @param recipient Target account that receives liquidity.
 * @param delRisky Amount of risky tokens to provide as liquidity.
 * @param delStable Amount of stable tokens to provide as Liquidity.
 * @param delLiquidity Desired amount of liquidity to mint.
 * @param fromMargin Use margin balance to pay for liquidity deposit.
 * @param slippageTolerance Maximum difference in liquidity received from expected liquidity.
 * @param createPool Create a pool and allocate liquidity to it.
 *
 * @beta
 */
export interface AllocateOptions extends PermitTokens, LiquidityOptions, RecipientOptions, NativeOptions, Deadline {
  fromMargin: boolean
  slippageTolerance: Percentage
  createPool?: boolean
}

/** Remove liquidity argument details. */
export interface RemoveOptions extends LiquidityOptions, RecipientOptions, NativeOptions, Deadline {
  expectedRisky: Wei
  expectedStable: Wei
  toMargin: boolean
  slippageTolerance: Percentage
}

```

### 🕳️ Allocating liquidity

```
async function onAllocate(pool: Pool, options: AllocateOptions): Promise<PositionAdjustmentDetails> {
    return rmm.allocate({ pool, options }).then(data => data)
}
```

### 💎 Removing liquidity

```
async function onRemove(pool: Pool, options: RemoveOptions): Promise<PositionAdjustmentDetails> {
    return rmm.remove({ pool, options }).then(data => data)
}
```

### 🧮 Usage locally

Before running any command, make sure to install dependencies:

```sh
$ yarn install
```

### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

### Test

Run the Mocha tests:

```sh
$ yarn test
```

## 📃 Deploy RMM

Deploy the protocol to a network:

```sh
$ yarn deploy --network nameOfNetwork
```

This will call a hardhat task that deploys the RMM protocol contracts from a loaded signer and saves the addresses to /deployments.

Here are the options for the `deploy` task:

- `--defender` (optional): Flag to attempt to use an Open Zeppelin Defender Relay Signer, if it exists in the hardhat.config.ts file.
- `--channel` (optional): Directory name in /deployments/ to save the deployment to.
- `--gasPrice` (optinal): Price to pay for gas.
- `--testweth` (optional): Only for test networks, allows specifying a WETH9 address.

### 🪞 Deploy RMM Pools Script

> Warning: Currently failing for node versions above 14.7.4. Unresolved promises are not handled in the higher node versions, and instead the process is exited with a non-zero error code.

Deploy pools in the config of the `deploy-pools.ts` script:

```sh
$ yarn deploy:pools --network nameOfNetwork
```

Creating RMM pools is a process that requires connecting to the protocol, fetching token metadata, and building the transaction's arguments. This script handles loading tokens from a saved pool deployment, located in `/deployments/*/pools.json`.

All the logic executed by a hardhat script must exist in the script file. Here is an example:

```
import hre from 'hardhat'
import {EthersRmm} from 'src/EthersRmm'
import {deployPools} from 'utils/deployPools'
import {poolDeployer} from 'utils/poolDeployer/

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

  const deployer = new PoolDeployer(chainId, POOL_DEPLOYMENTS_SAVE, POOL_CONFIG_TO_DEPLOY, rmm)

  await deployPools(deployer)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })


```

### Credits

Inspired by [Liquity Ethers](https://github.com/liquity/dev/tree/main/packages/lib-ethers).
