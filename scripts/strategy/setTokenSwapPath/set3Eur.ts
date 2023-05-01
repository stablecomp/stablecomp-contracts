import {strategyTask} from "../../01_task/sCompTask";

const threeEur = require('../../../../info/deploy_address/scaling_node/strategies/3Eur/3Eur.json');

async function main(): Promise<void> {
}

main()
    .then(async () => {
        await strategyTask.setTokenSwapPath(threeEur.sCompStrategy.address, "crv_eurT")
        await strategyTask.setTokenSwapPath(threeEur.sCompStrategy.address, "cvx_eurT")
        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

