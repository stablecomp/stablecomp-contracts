import {deployScompTask, strategyTask} from "../01_task/sCompTask";
import {utilsTask} from "../01_task/standard/utilsTask";

const mainnetAddress = require('../../info/deploy_address/address_scaling_node/mainAddress.json');
const strategyInfo = require('../../info/deploy_address/address_scaling_node/strategies/Mim3crv/Mim3crv.json');

async function main(): Promise<void> {

}

main()
    .then(async () => {
        let newFeeGovernance = 500 // 500 -> 5% - 450 -> 4,5%
        // change fee
        await strategyTask.executeChangeFeeStrategy(mainnetAddress.sCompTimelockController.address, strategyInfo.sCompStrategy.address, newFeeGovernance);
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

