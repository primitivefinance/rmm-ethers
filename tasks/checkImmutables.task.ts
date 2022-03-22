import { task } from 'hardhat/config'

task('checkImmutables', 'Checks manager immutable variables')
  .addOptionalParam('manager', 'Address of the manager')
  .setAction(async (args, hre) => {
    await hre.run('compile')

    const [signer] = await hre.ethers.getSigners()
    const rmm = await hre.connect(signer)

    const managerAbi = ['function positionDescriptor() view returns(address)']
    const descriptorAbi = ['function positionRenderer() view returns(address)']
    const manager = new hre.ethers.Contract(rmm.connection.addresses.primitiveManager, managerAbi, signer)
    const descriptor = new hre.ethers.Contract(rmm.connection.addresses.positionDescriptor, descriptorAbi, signer)

    const descriptorCall = await manager.positionDescriptor()
    const rendererCall = await descriptor.positionRenderer()

    console.log(
      'Verify immutable variables:',
      descriptorCall === rmm.connection.addresses.positionDescriptor,
      rendererCall === rmm.connection.addresses.positionRenderer,
    )
  })
