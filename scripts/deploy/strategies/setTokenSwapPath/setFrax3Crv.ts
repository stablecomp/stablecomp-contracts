import {strategyTask} from "../../../01_task/sCompTask";

const frax3Crv = require('../../../../info/deploy_address/address_scaling_node/strategies/Frax3crv/Frax3crv.json');

async function main(): Promise<void> {
}

main()
    .then(async () => {
        await strategyTask.setTokenSwapPathConfig(frax3Crv.sCompStrategy.address, "crv_frax")
        await strategyTask.setTokenSwapPathConfig(frax3Crv.sCompStrategy.address, "cvx_frax")
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

