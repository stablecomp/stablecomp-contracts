import hardhat  from "hardhat";
const { ethers } = hardhat;
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Contract} from "@ethersproject/contracts";

import {ConfigStrategy, deployScompTask} from "../scripts/01_task/sCompTask";

const curveInfo = require('../info/address_mainnet/curveAddress.json');

let deployer: SignerWithAddress;
let admin: SignerWithAddress;
let account2: SignerWithAddress;
let account3: SignerWithAddress;
let account4: SignerWithAddress;

let oneClick : Contract;
let controller : Contract;
let surplusConvert : Contract;
let oracleRouter : Contract;
let timeLockController : Contract;
let vault3Eur : Contract;
let strategy3Eur : Contract;
let vaultBusd3Crv : Contract;
let strategyBusd3Crv : Contract;
let vaultDola3Crv : Contract;
let strategyDola3Crv : Contract;
let vaultEuroC3Crv : Contract;
let strategyEuroC3Crv : Contract;
let vaultFrax3Crv : Contract;
let strategyFrax3Crv : Contract;
let vaultFraxUsdc : Contract;
let strategyFraxUsdc : Contract;
let vaultIbEurSEur : Contract;
let strategyIbEurSEur : Contract;
let vaultMim3Crv : Contract;
let strategyMim3Crv : Contract;
let vaultTusd3Crv : Contract;
let strategyTusd3Crv : Contract;
let vaultUsdd3Crv : Contract;
let strategyUsdd3Crv : Contract;


before(async function () {
    [deployer, admin, account2, account3, account4] = await ethers.getSigners();
    console.log("main script start with deployer address: ", deployer.address)

});

describe("Testing deploy", async function () {

    describe('Setup', async () => {

        it('Deploy main', async () => {
            oneClick = await deployScompTask.deployOneClick();
            let balanceBeforeController = await deployer.getBalance();
            controller = await deployScompTask.deployController(deployer.address, deployer.address, deployer.address)
            let balanceAfterController = await deployer.getBalance();
            let diff = balanceBeforeController.sub(balanceAfterController);
            console.log("Cost deploy: " + diff)
            surplusConvert = await deployScompTask.deploySurplusConverterV2(deployer.address, deployer.address,  deployer.address, [deployer.address, deployer.address])
            oracleRouter = await deployScompTask.deployOracleRouter();
            timeLockController = await deployScompTask.deployTimeLockController([deployer.address], [deployer.address]);
        });

        it('Deploy vault', async () => {
            vault3Eur = await deployScompTask.deployVault(controller.address, curveInfo.lp.threeEur, deployer.address,0)
            vaultBusd3Crv = await deployScompTask.deployVault(controller.address, curveInfo.lp.busd3crv, deployer.address,0)
            vaultDola3Crv = await deployScompTask.deployVault(controller.address, curveInfo.lp.dola3crv, deployer.address,0)
            vaultEuroC3Crv = await deployScompTask.deployVault(controller.address, curveInfo.lp.euroc3crv, deployer.address,0)
            vaultFrax3Crv = await deployScompTask.deployVault(controller.address, curveInfo.lp.frax3crv, deployer.address,0)
            vaultFraxUsdc = await deployScompTask.deployVault(controller.address, curveInfo.lp.fraxUsdc, deployer.address,0)
            vaultIbEurSEur = await deployScompTask.deployVault(controller.address, curveInfo.lp.ibEurSEur, deployer.address,0)
            vaultMim3Crv = await deployScompTask.deployVault(controller.address, curveInfo.lp.mim3crv, deployer.address,0)
            vaultTusd3Crv = await deployScompTask.deployVault(controller.address, curveInfo.lp.tusd3crv, deployer.address,0)
            vaultUsdd3Crv = await deployScompTask.deployVault(controller.address, curveInfo.lp.usdd3crv, deployer.address,0)
        });

        it('Deploy strategies', async () => {
            let config3eur: ConfigStrategy = await deployScompTask.getConfig("3eur")
            let configBusd3crv: ConfigStrategy = await deployScompTask.getConfig("busd3crv")
            let configDola3crv: ConfigStrategy = await deployScompTask.getConfig("dola3crv")
            let configEuroC3crv: ConfigStrategy = await deployScompTask.getConfig("euroc3crv")
            let configFrax3crv: ConfigStrategy = await deployScompTask.getConfig("frax3crv")
            let configFraxUsdc: ConfigStrategy = await deployScompTask.getConfig("fraxusdc")
            let configIbEurSEur: ConfigStrategy = await deployScompTask.getConfig("ibeurseur")
            let configMim3crv: ConfigStrategy = await deployScompTask.getConfig("mim3crv")
            let configTusd3Crv: ConfigStrategy = await deployScompTask.getConfig("tusd3crv")
            let configUsdd3Crv: ConfigStrategy = await deployScompTask.getConfig("usdd3crv")

            strategy3Eur = await deployScompTask.deployStrategy(config3eur.name, deployer.address, surplusConvert.address, controller.address,
                config3eur.want, config3eur.tokenCompound, config3eur.tokenCompoundPosition, config3eur.pidPool, config3eur.feeGovernance, config3eur.feeStrategist, config3eur.feeWithdraw,
                config3eur.curveSwap, config3eur.nElementPool, config3eur.versionStrategy)
            strategyBusd3Crv = await deployScompTask.deployStrategy(configBusd3crv.name, deployer.address, surplusConvert.address, controller.address,
                configBusd3crv.want, configBusd3crv.tokenCompound, configBusd3crv.tokenCompoundPosition, configBusd3crv.pidPool, configBusd3crv.feeGovernance, configBusd3crv.feeStrategist, configBusd3crv.feeWithdraw,
                configBusd3crv.curveSwap, configBusd3crv.nElementPool, configBusd3crv.versionStrategy)
            strategyDola3Crv = await deployScompTask.deployStrategy(configDola3crv.name, deployer.address, surplusConvert.address, controller.address,
                configDola3crv.want, configDola3crv.tokenCompound, configDola3crv.tokenCompoundPosition, configDola3crv.pidPool, configDola3crv.feeGovernance, configDola3crv.feeStrategist, configDola3crv.feeWithdraw,
                configDola3crv.curveSwap, configDola3crv.nElementPool, configDola3crv.versionStrategy)
            strategyEuroC3Crv = await deployScompTask.deployStrategy(configEuroC3crv.name, deployer.address, surplusConvert.address, controller.address,
                configEuroC3crv.want, configEuroC3crv.tokenCompound, configEuroC3crv.tokenCompoundPosition, configEuroC3crv.pidPool, configEuroC3crv.feeGovernance, configEuroC3crv.feeStrategist, configEuroC3crv.feeWithdraw,
                configEuroC3crv.curveSwap, configEuroC3crv.nElementPool, configEuroC3crv.versionStrategy)
            strategyFrax3Crv = await deployScompTask.deployStrategy(configFrax3crv.name, deployer.address, surplusConvert.address, controller.address,
                configFrax3crv.want, configFrax3crv.tokenCompound, configFrax3crv.tokenCompoundPosition, configFrax3crv.pidPool, configFrax3crv.feeGovernance, configFrax3crv.feeStrategist, configFrax3crv.feeWithdraw,
                configFrax3crv.curveSwap, configFrax3crv.nElementPool, configFrax3crv.versionStrategy)
            strategyFraxUsdc = await deployScompTask.deployStrategy(configFraxUsdc.name, deployer.address, surplusConvert.address, controller.address,
                configFraxUsdc.want, configFraxUsdc.tokenCompound, configFraxUsdc.tokenCompoundPosition, configFraxUsdc.pidPool, configFraxUsdc.feeGovernance, configFraxUsdc.feeStrategist, configFraxUsdc.feeWithdraw,
                configFraxUsdc.curveSwap, configFraxUsdc.nElementPool, configFraxUsdc.versionStrategy)
            strategyIbEurSEur = await deployScompTask.deployStrategy(configIbEurSEur.name, deployer.address, surplusConvert.address, controller.address,
                configIbEurSEur.want, configIbEurSEur.tokenCompound, configIbEurSEur.tokenCompoundPosition, configIbEurSEur.pidPool, configIbEurSEur.feeGovernance, configIbEurSEur.feeStrategist, configIbEurSEur.feeWithdraw,
                configIbEurSEur.curveSwap, configIbEurSEur.nElementPool, configIbEurSEur.versionStrategy)
            strategyMim3Crv = await deployScompTask.deployStrategy(configMim3crv.name, deployer.address, surplusConvert.address, controller.address,
                configMim3crv.want, configMim3crv.tokenCompound, configMim3crv.tokenCompoundPosition, configMim3crv.pidPool, configMim3crv.feeGovernance, configMim3crv.feeStrategist, configMim3crv.feeWithdraw,
                configMim3crv.curveSwap, configMim3crv.nElementPool, configMim3crv.versionStrategy)
            strategyTusd3Crv = await deployScompTask.deployStrategy(configTusd3Crv.name, deployer.address, surplusConvert.address, controller.address,
                configTusd3Crv.want, configTusd3Crv.tokenCompound, configTusd3Crv.tokenCompoundPosition, configTusd3Crv.pidPool, configTusd3Crv.feeGovernance, configTusd3Crv.feeStrategist, configTusd3Crv.feeWithdraw,
                configTusd3Crv.curveSwap, configTusd3Crv.nElementPool, configTusd3Crv.versionStrategy)
            strategyUsdd3Crv = await deployScompTask.deployStrategy(configUsdd3Crv.name, deployer.address, surplusConvert.address, controller.address,
                configUsdd3Crv.want, configUsdd3Crv.tokenCompound, configUsdd3Crv.tokenCompoundPosition, configUsdd3Crv.pidPool, configUsdd3Crv.feeGovernance, configUsdd3Crv.feeStrategist, configUsdd3Crv.feeWithdraw,
                configUsdd3Crv.curveSwap, configUsdd3Crv.nElementPool, configUsdd3Crv.versionStrategy)
        });

    });

});
