import hardhat, {ethers} from 'hardhat';
const { run} = hardhat;

async function main(): Promise<void> {

    await run('compile');

}

async function verify(): Promise<void> {

    const [deployer] = await ethers.getSigners();

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        await run("verify:verify", {
            address: "0x5073383c90cFBcc666227a67F301dcF910C3971e",
            constructorArguments: [
                "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
                "0x753fB727B2487fd22c8860167aCf01E20B69FbeA",
                "0x2b276218D962dEEbF96C749ffB228601b2C7a587",
                0
            ],
        });
    }
}

  main()
    .then(async () => {
      await verify();
      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

