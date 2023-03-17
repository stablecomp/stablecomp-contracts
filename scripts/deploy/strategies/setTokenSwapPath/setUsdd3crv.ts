import {strategyTask} from "../../../01_task/sCompTask";

const usdd3Crv = require('../../../../info/deploy_address/address_scaling_node/strategies/Usdd3crv/Usdd3crv.json');

async function main(): Promise<void> {
}

main()
    .then(async () => {
        await strategyTask.setTokenSwapPathConfig(usdd3Crv.sCompStrategy.address, "crv_usdd")
        await strategyTask.setTokenSwapPathConfig(usdd3Crv.sCompStrategy.address, "cvx_usdd")
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

