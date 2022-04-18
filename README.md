# 🍄 rmm-ethers

![version](https://img.shields.io/npm/v/@primitivefi/rmm-ethers) ![npm](https://img.shields.io/npm/dt/@primitivefi/rmm-ethers) ![license](https://img.shields.io/npm/l/@primitivefi/rmm-ethers) ![stars](https://img.shields.io/github/stars/primitivefinance/rmm-ethers?style=social&color=%23FFB31A)

> Easily connect and transact with RMM protocol.

## 🧩 Features

- 🌲 Deploy RMM protocol
- ⚡️ Easily connect to an RMM deployment
- 🌊 Create RMM pools
- ☄️ Allocate or remove liquidity
- 🎁 Transfer positions
- 🔭 Read protocol data

## 📦 Installation

> This software is in Alpha.

Installing locally:

```bash
# Clone the repository
git clone https://github.com/primitivefinance/rmm-ethers.git

# Install dependencies
yarn install
```

Installing as a package:

```bash
# Using yarn
yarn add @primitivefi/rmm-ethers

# Or using npm
npm i @primitivefi/rmm-ethers
```

Use it by connecting with a signer or provider:

```typescript
// Import the EthersRmm class
import { EthersRmm } from '@primitivefi/rmm-ethers'

// Use the class by connecting to a deployment
await EthersRmm.connect(signerOrProvider)
```

## ✏️ Usage as a Package

This package is designed to extend the [rmm-sdk](https://github.com/primitivefinance/rmm-sdk) package. The SDK has the entity models and interfaces that are used by rmm-ethers to send transactions.

### 🪝 As a react hook:

Here is an example of a React hook that makes use of web3-react and SWR:

```typescript
import useSWR, { SWRResponse } from 'swr'
import { useWeb3React } from 'web3-react'
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
    },
  )

  return result
}
```

### 🌊 Fetch a pool

```typescript
import { Pool } from '@primitivefi/rmm-sdk'
import { EthersRmm, Position } from '@primitivefi/rmm-ethers'

async function getPool(poolId: string): Promise<Pool> {
  return rmm.getPool(poolId).then(data => data)
}
```

### ⚱️ Fetching pool liquidity positions

```typescript
import { Pool } from '@primitivefi/rmm-sdk'
import { EthersRmm, Position } from '@primitivefi/rmm-ethers'

async function getPoolPosition(pool: Pool, account: string): Promise<Position> {
  return rmm.getPosition(pool, account).then(data => data)
}
```

## Adjusting Positions

When allocating or removing liquidity, the arguments must match the respective interfaces, which live in the [rmm-sdk](https://github.com/primitivefinance/rmm-sdk):

```typescript
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

/** Provide liquidity argument details. */
export interface AllocateOptions extends PermitTokens, LiquidityOptions, RecipientOptions, NativeOptions, Deadline {
  fromMargin: boolean
  slippageTolerance: Percentage
  createPool?: boolean
}

/** Remove liquidity argument details. */
export interface RemoveOptions extends LiquidityOptions, RecipientOptions, NativeOptions, Deadline {
  additionalRisky: Wei
  additionalStable: Wei
  toMargin: boolean
  slippageTolerance: Percentage
}
```

### 🕳️ Allocating liquidity

```typescript
import { Pool, AllocateOptions } from '@primitivefi/rmm-sdk'
import { EthersRmm, PositionAdjustmentDetails } from '@primitivefi/rmm-ethers'

async function onAllocate(rmm: EthersRmm, pool: Pool, options: AllocateOptions): Promise<PositionAdjustmentDetails> {
  return rmm.allocate({ pool, options }).then(data => data)
}
```

### 💎 Removing liquidity

```typescript
import { Pool, AllocateOptions } from '@primitivefi/rmm-sdk'
import { EthersRmm, PositionAdjustmentDetails } from '@primitivefi/rmm-ethers'

async function onRemove(rmm: EthersRmm, pool: Pool, options: RemoveOptions): Promise<PositionAdjustmentDetails> {
  return rmm.remove({ pool, options }).then(data => data)
}
```

## 🧮 Usage locally

Before running any command, make sure to install dependencies:

```bash
yarn install
```

### Compile

Compile the smart contracts with Hardhat:

```bash
yarn compile
```

### Test

Run the Mocha tests:

```bash
yarn test
```

## 📃 Deploy RMM

Deploy the protocol to a network:

```bash
yarn deploy --network nameOfNetwork
```

This will call a hardhat task that deploys the RMM protocol contracts from a loaded signer and saves the addresses to `/deployments`.

Here are the options for the `deploy` task:

- `--defender` (optional): Flag to attempt to use an Open Zeppelin Defender Relay Signer, if it exists in the hardhat.config.ts file.
- `--channel` (optional): Directory name in /deployments/ to save the deployment to.
- `--gasPrice` (optinal): Price to pay for gas.
- `--testweth` (optional): Only for test networks, allows specifying a WETH9 address.

### Deploy Primitive Engines - Pair contracts

```bash
yarn deploy:engine --network nameOfNetwork
```

This is a script that runs which requires two of the token addresses. Here is the script, which should be edited to suit the deployment needs:

```typescript
import hre from 'hardhat'
import { Signer } from '@ethersproject/abstract-signer'
import { DefenderRelaySigner } from 'defender-relay-client/lib/ethers'
import { deployEngine } from '../utils/deployEngine'

type Signers = Signer | DefenderRelaySigner

export async function main() {
  const signer: Signers = await hre.run('useSigner')

  const rmm = await hre.connect(signer)
  const chainId = rmm.connection.chainId
  if (chainId === 1) throw new Error('Do not use this in prod!')

  const risky = '0xc778417E063141139Fce010982780140Aa0cD5Ab' // rinkeby:WETH: FIX
  const stable = '0x522064c1EafFEd8617BE64137f66A71D6C5c9aA3' // rinkeby:USDC: FIX

  await deployEngine(rmm, risky, stable)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
```

### 🪞 Deploy RMM Pools Script

> Warning: Currently failing for node versions above 14.7.4. Unresolved promises are not handled in the higher node versions, and instead the process is exited with a non-zero error code.

> Work in progress: This script is still being improved! Consider it an alpha version.

Deploy pools in the config of the `deploy-pools.ts` script:

```bash
yarn deploy:pools --network nameOfNetwork
```

Creating RMM pools is a process that requires connecting to the protocol, fetching token metadata, and building the transaction's arguments. This script handles loading tokens from a saved pool deployment, located in `/deployments/*/pools.json`.

All the logic executed by a hardhat script must exist in the script file. Here is an example:

```typescript
import hre from 'hardhat'
import { EthersRmm } from 'src/EthersRmm'
import { deployPools } from 'utils/deployPools'
import { poolDeployer } from 'utils/poolDeployer'

export async function main() {
  const signer: Signers = await hre.run('useSigner')
  const from = await signer.getAddress()

  const rmm = await hre.connect(signer)

  const chainId = rmm.connection.chainId

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

## 📌 Misc. Scripts

Generate documentation locally:

```
yarn docs
```

Deploy to a local ganache-cli instance:

```
yarn deploy:devnet
```

Delete a local deployment to ganache-cli:

```
yarn delete-dev-deployments
```

## 🛡️ Use with Open Zeppelin Defender Relays

The OZ Defender relayers are a safer way to execute transactions on-chain.

The `hardhat.config.ts` is extended to include OZ defender relay API key and secret:

```typescript
defender: {
    [chainIds.rinkeby]: {
      apiKey: RELAY_RINKEBY_API || '',
      apiSecret: RELAY_RINKEBY_SECRET || '',
    },
}
```

Adding this to the hardhat config will expose the relay signer through the task `useSigner`.

This task is currently only used in the `deployPools.ts` script, so pools can be deployed safely from the OZ defender relay.

🖋️ `useSigner`

If this subtask is run from task run with a `--network` flag, and the network has an OZ relayer config in the hardhat config file, this task will return the `Signer` object for the relayer. Else, useSigner will default to the `ethers.getSigners()`. This subtask can be used in custom scripts so you can choose to use a relayer or a private key stored in `.env`.

- `--i` (optional): Index of the signer to use from `ethers.getSigners()`

## ⛑ Contribute

Feel free to suggest changes by opening a pull request, or posting an issue. There is a dedicated `dev` channel in the [Primitive discord](https://discord.gg/primitive).

## Credits

Inspired by [Liquity Ethers](https://github.com/liquity/dev/tree/main/packages/lib-ethers).
