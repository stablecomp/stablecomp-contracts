import {deployScompTask} from "../01_task/sCompTask";

async function main(): Promise<void> {
}

main()
    .then(async () => {
        await deployScompTask.deployOracleRouter();
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

