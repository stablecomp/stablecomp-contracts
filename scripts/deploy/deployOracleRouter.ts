import {deployScompTask} from "../01_task/sCompTask";
import {ethers} from "hardhat";

async function main(): Promise<void> {
}

main()
    .then(async () => {
        const [deployer] = await ethers.getSigners();

        let balanceBeforeDeploy = await deployer.getBalance();

        await deployScompTask.deployOracleRouter();

        let balanceAfterDeploy = await deployer.getBalance();
        let diffDeploy = balanceBeforeDeploy.sub(balanceAfterDeploy);

        console.log("Cost deploy oracle router: " + diffDeploy)


        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

