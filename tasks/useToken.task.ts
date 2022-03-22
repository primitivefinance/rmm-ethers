import { subtask } from 'hardhat/config'
import { TASK_USE_TOKEN } from './constants/task-names'

import ERC20Artifact from '../artifacts/@primitivefi/rmm-manager/contracts/interfaces/external/IERC20WithMetadata.sol/IERC20WithMetadata.json'
import ERC20Mintable from '../artifacts/contracts/MintableERC20.sol/MintableERC20.json'
import { IERC20WithMetadata } from '../typechain'

subtask(TASK_USE_TOKEN, 'use a token address')
  .addFlag('mintable', 'use the mintable test token abi')
  .addParam('address', 'use a token at a specific address')
  .addOptionalParam('log', 'boolean to log the token in console')
  .setAction(
    async (
      args,
      hre,
    ): Promise<{
      contract: IERC20WithMetadata
      metadata: { address: string; name: string; symbol: string; decimals: number }
    }> => {
      const signer = await hre.run('useSigner')

      const token: IERC20WithMetadata = new hre.ethers.Contract(
        args.address,
        args.mintable ? ERC20Mintable.abi : ERC20Artifact.abi,
        signer,
      ) as IERC20WithMetadata

      const name = await token.name()
      const symbol = await token.symbol()
      const decimals = await token.decimals()
      if (args.log) console.log(`    - Using ${symbol} with ${decimals} decimals at address:`, token.address)

      return { contract: token, metadata: { address: token.address, name, symbol, decimals } }
    },
  )
