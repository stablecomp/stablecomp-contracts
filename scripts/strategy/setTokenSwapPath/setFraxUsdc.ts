import {strategyTask} from "../../01_task/sCompTask";

const fraxUsdc = require('../../../../info/deploy_address/address_scaling_node/strategies/FraxUsdc/FraxUsdc.json');

async function main(): Promise<void> {
}

main()
    .then(async () => {
        await strategyTask.setTokenSwapPathConfig(fraxUsdc.sCompStrategy.address, "crv_frax")
        await strategyTask.setTokenSwapPathConfig(fraxUsdc.sCompStrategy.address, "cvx_frax")
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

