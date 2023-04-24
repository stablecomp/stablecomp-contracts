import {strategyTask} from "../../01_task/sCompTask";

const mim3Crv = require('../../../../info/deploy_address/address_scaling_node/strategies/Mim3crv/Mim3crv.json');

async function main(): Promise<void> {
}

main()
    .then(async () => {
        await strategyTask.setTokenSwapPathConfig(mim3Crv.sCompStrategy.address, "crv_mim")
        await strategyTask.setTokenSwapPathConfig(mim3Crv.sCompStrategy.address, "cvx_mim")
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

