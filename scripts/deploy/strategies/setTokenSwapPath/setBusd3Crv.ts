import {strategyTask} from "../../../01_task/sCompTask";

const busd3Crv = require('../../../../info/deploy_address/address_scaling_node/strategies/Busd3crv/Busd3crv.json');

async function main(): Promise<void> {
}

main()
    .then(async () => {
        await strategyTask.setTokenSwapPathConfig(busd3Crv.sCompStrategy.address, "crv_busd")
        await strategyTask.setTokenSwapPathConfig(busd3Crv.sCompStrategy.address, "cvx_busd")
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

