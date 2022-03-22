import { task } from 'hardhat/config'
import { utils } from 'ethers'
import PrimitiveFactory from '@primitivefi/rmm-core/artifacts/contracts/PrimitiveFactory.sol/PrimitiveFactory.json'

const FACTORY_DEPLOYMENT_HASH = '0x02783ecd003548fb4dc3796ff7577e76525fbb74cb56e8f96f51c9a17c5d8bed'

task('checkDeployedBytecode', 'Checks if the engine bytecode hashes are matching')
  .addOptionalParam('factory', 'Address of the factory')
  .addOptionalParam('manager', 'Address of the manager')
  .setAction(async (args, hre) => {
    await hre.run('compile')

    const factoryHash = utils.keccak256(PrimitiveFactory.bytecode)
    const deployedFactory = await hre.ethers.provider.getTransaction(FACTORY_DEPLOYMENT_HASH)
    const deployedHash = utils.keccak256(deployedFactory.data)
    console.log(
      `Does the factory bytecode imported from the artifact match the deployed bytecode?`,
      factoryHash === deployedHash,
      factoryHash,
      deployedHash,
    )
  })
