import {strategyTask} from "../../01_task/sCompTask";

const euroC3Crv = require('../../../../info/deploy_address/address_scaling_node/strategies/EuroC3Crv/EuroC3Crv.json');

async function main(): Promise<void> {
}

main()
    .then(async () => {
        await strategyTask.setTokenSwapPathConfig(euroC3Crv.sCompStrategy.address, "crv_euroC")
        await strategyTask.setTokenSwapPathConfig(euroC3Crv.sCompStrategy.address, "cvx_euroC")
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

