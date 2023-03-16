import hardhat from 'hardhat';
const { run} = hardhat;

async function main(): Promise<void> {
    await run('compile');

}

async function verify(): Promise<void> {

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        await run("verify:verify", {
            address: "",
            constructorArguments: [
                "",
                "",
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

