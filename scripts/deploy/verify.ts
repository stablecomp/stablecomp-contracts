import hardhat from 'hardhat';
const { run} = hardhat;

async function main(): Promise<void> {

}

async function verify(): Promise<void> {

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        await run("verify:verify", {
            address: "0x0a1da14519309eCEa6E19DC940D95A7Fc850a911",
            constructorArguments: [
                "0xEcd5e75AFb02eFa118AF914515D6521aaBd189F1",
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

