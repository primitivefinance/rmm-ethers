import { Contract } from 'ethers'
import { getAddress } from 'ethers/lib/utils'
import hre from 'hardhat'
import { EthersRmm } from '../src'

async function main() {
  const signer = await hre.run('useSigner')
  const rmm = await EthersRmm.connect(signer)
  const addresses = rmm.connection.addresses

  const abi = ['function WETH9() public view returns (address)']
  const manager = new Contract(addresses.primitiveManager, abi, signer)
  const weth = await manager.WETH9()

  await hre.run('verify:verify', {
    address: addresses.primitiveFactory,
    constructorArguments: [],
  })
  await hre.run('verify:verify', {
    address: addresses.positionRenderer,
    constructorArguments: [],
  })
  await hre.run('verify:verify', {
    address: addresses.positionDescriptor,
    constructorArguments: [addresses.positionRenderer],
  })
  await hre.run('verify:verify', {
    address: addresses.primitiveManager,
    constructorArguments: [addresses.primitiveFactory, getAddress(weth), addresses.positionDescriptor],
  })
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
