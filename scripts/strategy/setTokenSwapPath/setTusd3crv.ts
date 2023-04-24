import {strategyTask} from "../../01_task/sCompTask";

const tusd3Crv = require('../../../../info/deploy_address/address_scaling_node/strategies/Tusd3crv/Tusd3crv.json');

async function main(): Promise<void> {
}

main()
    .then(async () => {
        await strategyTask.setTokenSwapPathConfig(tusd3Crv.sCompStrategy.address, "crv_tusd")
        await strategyTask.setTokenSwapPathConfig(tusd3Crv.sCompStrategy.address, "cvx_tusd")
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

