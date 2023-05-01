import {strategyTask} from "../../01_task/sCompTask";

const dola3Crv = require('../../../../info/deploy_address/address_scaling_node/strategies/Dola3crv/Dola3crv.json');

async function main(): Promise<void> {
}

main()
    .then(async () => {
        await strategyTask.setTokenSwapPath(dola3Crv.sCompStrategy.address, "crv_dola")
        await strategyTask.setTokenSwapPath(dola3Crv.sCompStrategy.address, "cvx_dola")
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

