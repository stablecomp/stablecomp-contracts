import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import fs from "fs";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {erc20Task} from "./standard/erc20Task";
import {BigNumber} from "ethers";
import {oracleRouterTask} from "./oracle/oracleRouterTask";
import {min} from "hardhat/internal/util/bigint";
const { run, ethers } = hardhat;

const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');
const routerInfo = require('../../info/address_mainnet/routerAddress.json');
const curveInfo = require('../../info/address_mainnet/curveAddress.json');
const oracleInfo = require('../../info/address_mainnet/oracleAddress.json');

// DEPLOY FUNCTION
async function deploySCompToken(): Promise<Contract> {
    let factory = await ethers.getContractFactory("StableCompToken");
    let contract = await factory.deploy();

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        let jsonData = {
            sCompTokenContract: {
                address: contract.address,
                args: {},
            }
        }
        await writeAddressInJson("token", "sCompTokenContract", jsonData)

        if (
            hardhat.network.name !== "scaling_node"
        ) {
            // Wait 30 seconds
            await new Promise(resolve => setTimeout(resolve, 30000));

            await run("verify:verify", {
                address: contract.address,
                constructorArguments: [],
            });
        }
    }

    return contract;
}

async function deployVe(sCompTokenAddress: string): Promise<Contract> {
    // Voting escrow scomp config
    let nameVe = "Voting Escrow Scomp"
    let symbolVe = "veScomp"
    let versionVe = "veScomp1.0.0";

    let factory = await ethers.getContractFactory("veScomp");
    let contract = await factory.deploy(sCompTokenAddress, nameVe, symbolVe, versionVe);

    const [deployer] = await ethers.getSigners();
    contract = await ethers.getContractAt("IVotingEscrow", contract.address, deployer);

    // Write json && Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {

        let jsonData = {
            veScompContract: {
                address: contract.address,
                args: {
                    sCompTokenAddress: sCompTokenAddress,
                    nameVe: nameVe,
                    symbolVe: symbolVe,
                    versionVe: versionVe,
                },
            },
        }
        await writeAddressInJson("farming", "veScompContract", jsonData)

        if (
            hardhat.network.name !== "scaling_node"
        ) {
            // Wait 30 seconds
            await new Promise(resolve => setTimeout(resolve, 30000));

            await run("verify:verify", {
                address: contract.address,
                constructorArguments: [sCompTokenAddress, nameVe, symbolVe, versionVe],
            });
        }
    }

    return contract;
}

async function deployMasterchef(sCompTokenAddress: string, veAddress: string): Promise<Contract> {
    let tokenPerBlock = ethers.utils.parseEther("1.5");
    let delayStart = 600; // su eth 300 block/h circa
    let blockNumber = await ethers.provider.getBlockNumber();
    let initialBlock = blockNumber + delayStart;

    let factoryMasterchef = await ethers.getContractFactory("MasterChefScomp");
    let masterchefScomp = await factoryMasterchef.deploy(
        sCompTokenAddress,
        veAddress,
        tokenPerBlock,
        initialBlock
    );

    // Write json && Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        let jsonData = {
            masterchefScomp: {
                address: masterchefScomp.address,
                args: {
                    sCompTokenAddress: sCompTokenAddress,
                    veScompAddress: veAddress,
                    tokenPerBlock: tokenPerBlock,
                    initialBlock: initialBlock
                }
            },
        }
        await writeAddressInJson("farming", "masterchefScompContract", jsonData)

        if (
            hardhat.network.name !== "scaling_node"
        ) {
            // Wait 30 seconds
            await new Promise(resolve => setTimeout(resolve, 30000));

            await run("verify:verify", {
                address: masterchefScomp.address,
                constructorArguments: [sCompTokenAddress, veAddress, tokenPerBlock, initialBlock],
            });
        }
    }

    return masterchefScomp;
}

async function deployFeeDistribution(sCompTokenAddress: string, veAddress: string, admin: string, emergencyReturn: string): Promise<Contract> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let startTimestampFeeDistribution = block.timestamp;

    // todo change weth address with stable comp token in production

    let feeDistributionFactory = await ethers.getContractFactory("FeeDistribution");
    let feeDistributionContract = await feeDistributionFactory.deploy(
        veAddress,
        startTimestampFeeDistribution,
        tokenInfo.weth.address,
        admin,
        emergencyReturn
    )

    const [deployer] = await ethers.getSigners();
    feeDistributionContract = await ethers.getContractAt("IFeeDistributorFront", feeDistributionContract.address, deployer);

    // Write json && Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        let jsonData = {
            feeDistributionContract: {
                address: feeDistributionContract.address,
                args: {
                    veScompAddress: veAddress,
                    startTimestamp: startTimestampFeeDistribution,
                    tokenAddress: tokenInfo.weth.address,
                    admin: admin,
                    emergencyReturn: emergencyReturn
                }
            },
        }
        await writeAddressInJson("manageFee", "feeDistributionContract", jsonData)

        if (
            hardhat.network.name !== "scaling_node"
        ) {
            // Wait 30 seconds
            await new Promise(resolve => setTimeout(resolve, 30000));

            await run("verify:verify", {
                address: feeDistributionContract.address,
                constructorArguments: [ veAddress,
                    startTimestampFeeDistribution,
                    tokenInfo.weth.address,
                    admin,
                    emergencyReturn
                ],
            });
        }
    }

    return feeDistributionContract;
}

async function deploySurplusConverterV2(feeDistributionAddress: string, whitelisted: string, governor: string, guardians: string[]): Promise<Contract> {

    let surplusConverterFactory = await ethers.getContractFactory("SurplusConverterUniV2Sushi");
    let surplusConverterV2Contract = await surplusConverterFactory.deploy(
        tokenInfo.weth.address,
        feeDistributionAddress,
        routerInfo.uniswapV2,
        routerInfo.sushiswap,
        whitelisted,
        governor,
        guardians
    )

    // Write json
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        let jsonData = {
            surplusConverterV2Contract: {
                address: surplusConverterV2Contract.address,
                args: {
                    rewardToken: tokenInfo.weth.address,
                    feeDistributor: feeDistributionAddress,
                    uniswapV2Address: routerInfo.uniswapV2,
                    sushiswapAddress: routerInfo.sushiswap,
                    whitelisted: whitelisted,
                    governor: governor,
                    guardians: guardians
                }
            },
        }
        await writeAddressInJson("manageFee", "surplusConverterV2", jsonData)

        if (
            hardhat.network.name !== "scaling_node"
        ) {
            // Wait 30 seconds
            await new Promise(resolve => setTimeout(resolve, 30000));

            await run("verify:verify", {
                address: surplusConverterV2Contract.address,
                constructorArguments: [
                    tokenInfo.weth.address,
                    feeDistributionAddress,
                    routerInfo.uniswapV2,
                    routerInfo.sushiswap,
                    whitelisted,
                    governor,
                    guardians
                ],
            });
        }
    }

    // todo change weth address with scompToken
    let tx = await surplusConverterV2Contract.addToken(tokenInfo.crv.address, [tokenInfo.crv.address, tokenInfo.weth.address], 1);
    await tx.wait();
    tx = await surplusConverterV2Contract.addToken(tokenInfo.cvx.address, [tokenInfo.cvx.address, tokenInfo.weth.address], 1);
    await tx.wait();
    tx = await surplusConverterV2Contract.unpause();
    await tx.wait();

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost" &&
        hardhat.network.name !== "scaling_node"
    ) {
        // Wait 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));

        await run("verify:verify", {
            address: surplusConverterV2Contract.address,
            constructorArguments: [
                tokenInfo.weth.address,
                feeDistributionAddress,
                routerInfo.uniswapV2,
                routerInfo.sushiswap,
                whitelisted,
                governor,
                guardians
            ],
        });
    }

    return surplusConverterV2Contract;
}

async function deployController(governance: string, strategist: string, rewards: string): Promise<Contract> {

    // deploy controller
    let factoryController = await ethers.getContractFactory("SCompController")
    let sCompController = await factoryController.deploy(
        governance,
        strategist,
        rewards,
    );
    await sCompController.deployed();

    // Write json && Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        let jsonData = {
            sCompController: {
                address: sCompController.address,
                args: {
                    governance: governance,
                    strategist: strategist,
                    rewards: rewards,
                }
            },
        }
        await writeAddressInJson("controller", "sCompControllerContract", jsonData)

        if (
            hardhat.network.name !== "scaling_node"
        ) {
            // Wait 30 seconds
            await new Promise(resolve => setTimeout(resolve, 30000));

            await run("verify:verify", {
                address: sCompController.address,
                constructorArguments: [
                    governance,
                    strategist,
                    rewards,
                ],
            });
        }
    }

    return sCompController;
}

async function deployTimeLockController(proposer: string[], executor: string[]): Promise<Contract> {
    let minDelay = 86400

    // deploy timeLockController
    let factoryTimeLock = await ethers.getContractFactory("SCompTimeLockController")
    let sCompTimelockController = await factoryTimeLock.deploy(
        minDelay,
        proposer,
        executor
    );
    await sCompTimelockController.deployed();

    // Write json && Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        let jsonData = {
            sCompTimelockController: {
                address: sCompTimelockController.address,
                args: {
                    minDelay: minDelay,
                    proposer: proposer,
                    executors: executor,
                }
            },
        }
        await writeAddressInJson("timelock", "sCompTimeLockControllerContract", jsonData)

        if (
            hardhat.network.name !== "scaling_node"
        ) {
            // Wait 30 seconds
            await new Promise(resolve => setTimeout(resolve, 30000));

            await run("verify:verify", {
                address: sCompTimelockController.address,
                constructorArguments: [
                    minDelay,
                    proposer,
                    executor
                ],
            });
        }
    }

    return sCompTimelockController;
}

async function deployOracleRouter(): Promise<Contract> {
    let factory = await ethers.getContractFactory("OracleRouter")
    let oracleRouter = await factory.deploy();
    await oracleRouter.deployed();

    // Write json && Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        let jsonData = {
            oracleRouter: {
                address: oracleRouter.address,
                args: {}
            },
        }
        await writeAddressInJson("oracle", "oracleRouter", jsonData)

        if (
            hardhat.network.name !== "scaling_node"
        ) {
            // Wait 30 seconds
            await new Promise(resolve => setTimeout(resolve, 30000));

            await run("verify:verify", {
                address: oracleRouter.address,
                constructorArguments: [],
            });
        }
    }

    return oracleRouter;
}

async function deployOneClick(): Promise<Contract> {
    const [deployer] = await ethers.getSigners();
    let feeAmount = 20;
    let feeAddress = deployer.address;

    // deploy
    let factoryVault = await ethers.getContractFactory("OneClickV3")
    let oneClickV3 = await factoryVault.deploy(tokenInfo.weth.address, feeAmount, feeAddress);
    await oneClickV3.deployed();

    // Write json
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        let jsonData = {
            oneClickV3: {
                address: oneClickV3.address,
                args: {
                    weth: tokenInfo.weth,
                    oneClickFee: feeAmount,
                    oneClickFeeAddress: feeAddress
                }
            },
        }
        await writeAddressInJson("zapper", "oneClickV3", jsonData)
    }

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost" &&
        hardhat.network.name !== "scaling_node"
    ) {
        // Wait 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));

        await run("verify:verify", {
            address: oneClickV3.address,
            constructorArguments: [
                tokenInfo.weth,
                feeAmount,
                feeAddress
            ],
        });
    }

    return oneClickV3;
}

async function deployVault(controllerAddress: string, wantAddress: string, treasuryFeeAddress: string, feeDeposit: any): Promise<Contract> {
    // deploy
    let factoryVault = await ethers.getContractFactory("SCompVault")
    let sCompVault = await factoryVault.deploy(
        wantAddress,
        controllerAddress,
        treasuryFeeAddress,
        feeDeposit
    );
    await sCompVault.deployed();

    // Write json
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        let jsonData = {
            sCompVault: {
                address: sCompVault.address,
                args: {
                    wantAddress: wantAddress,
                    sCompControllerAddress: controllerAddress,
                    treasuryFee: treasuryFeeAddress,
                    depositFee: feeDeposit
                }
            },
        }
        let erc20Factory = await ethers.getContractFactory("ERC20");
        let erc20Contract = await erc20Factory.attach(wantAddress);
        let symbolWant = await erc20Contract.symbol();
        await writeAddressInJson("vault", "sCompVault_" + symbolWant, jsonData)
    }

    let sCompControllerFactory = await ethers.getContractFactory("SCompController");
    let sCompController = await sCompControllerFactory.attach(controllerAddress);
    const [deployer] = await ethers.getSigners();
    let tx = await sCompController.connect(deployer).setVault(wantAddress, sCompVault.address);
    await tx.wait();

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost" &&
        hardhat.network.name !== "scaling_node"
    ) {
        // Wait 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));

        await run("verify:verify", {
            address: sCompVault.address,
            constructorArguments: [
                wantAddress,
                controllerAddress,
                treasuryFeeAddress,
                feeDeposit
            ],
        });
    }

    return sCompVault;
}

async function deployStrategy(nameStrategy: string, governance: string, strategist: string,
                              controller: string, wantAddress: string, tokenCompound: string,
                              tokenCompoundPosition: number, pidPool: number, feeGovernance: number, feeStrategist: number,
                              feeWithdraw: number, curveSwapAddress: string, nElementPool: number ,
                              versionStrategy: string): Promise<Contract> {

    let factoryStrategy;
    if (versionStrategy == "1.2") {
        factoryStrategy = await ethers.getContractFactory("SCompStrategyV1_2")
    } else if (versionStrategy == "1.1") {
        factoryStrategy = await ethers.getContractFactory("SCompStrategyV1_1")
    } else {
        factoryStrategy = await ethers.getContractFactory("SCompStrategyV1_0")
    }

    let sCompStrategy = await factoryStrategy.deploy(
        nameStrategy,
        governance,
        strategist,
        controller,
        wantAddress,
        tokenCompound,
        pidPool,
        [feeGovernance, feeStrategist, feeWithdraw],
        {swap: curveSwapAddress, tokenCompoundPosition: tokenCompoundPosition, numElements: nElementPool}
    );
    await sCompStrategy.deployed();

    // Write json
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        let jsonData = {
            sCompStrategy: {
                address: sCompStrategy.address,
                args: {
                    nameStrategy: nameStrategy,
                    governance: governance,
                    strategist: strategist,
                    controller: controller,
                    want: wantAddress,
                    tokenCompound: tokenCompound,
                    pid: pidPool,
                    feeConfig: [feeGovernance, feeStrategist, feeWithdraw],
                    curvePool: {swap: curveSwapAddress, tokenCompoundPosition: tokenCompoundPosition, numElements: nElementPool}
                }
            }
        }
        let erc20Factory = await ethers.getContractFactory("ERC20");
        let erc20Contract = await erc20Factory.attach(wantAddress);
        let symbolWant = await erc20Contract.symbol();
        await writeAddressInJson("strategy", "sCompStrategy_" + symbolWant, jsonData)
    }

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost" &&
        hardhat.network.name !== "scaling_node"
    ) {
        // Wait 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));

        await run("verify:verify", {
            address: sCompStrategy.address,
            constructorArguments: [
                nameStrategy,
                governance,
                strategist,
                controller,
                wantAddress,
                tokenCompound,
                pidPool,
                [feeGovernance, feeStrategist, feeWithdraw],
                {swap: curveSwapAddress, tokenCompoundPosition: tokenCompoundPosition, numElements: nElementPool}
            ],
        });
    }

    return sCompStrategy;
}

async function writeAddressInJson(folder: string, nameFile: string, jsonData: any): Promise<void> {

    let infoPath = "./info/"
    if (!fs.existsSync(infoPath)) {
        fs.mkdirSync(infoPath);
    }

    let addressPath = infoPath + "./deploy_address/"
    if (!fs.existsSync(addressPath)) {
        fs.mkdirSync(addressPath);
    }

    let networkPath = addressPath + hardhat.network.name
    if (!fs.existsSync(networkPath)) {
        fs.mkdirSync(networkPath);
    }

    let folderPath = networkPath + "/" + folder +"/"
    if (!fs.existsSync(folderPath)){
        await fs.mkdirSync(folderPath);
        let folderPathBackup = folderPath + "/backup/"
        await fs.mkdirSync(folderPathBackup);
    }

    let path = folderPath + nameFile+".json"

    if (fs.existsSync(path)){
        let pathRename = "./info/deploy_address/"+ hardhat.network.name +"/"+ folder +"/backup/"+ nameFile +"_"+ Date.now() +".json"
        await fs.rename(path, pathRename, function(res:any) {});
    }

    let data = JSON.stringify(jsonData);
    fs.writeFileSync(path, data);
}

// STRATEGIES FUNCTION
async function setConfig(strategyAddress: string, config: ConfigStrategy, controllerAddress: string, oracleRouterAddress: string, timeLockControllerAddress: string): Promise<void> {
    let strategy: Contract = await getStrategy(strategyAddress)

    const [deployer] = await ethers.getSigners();

    // set router in strategy
    await strategy.connect(deployer).setUniswapV3Router(routerInfo.uniswapV3);
    await strategy.connect(deployer).setUniswapV2Router(routerInfo.uniswapV2);
    await strategy.connect(deployer).setSushiswapRouter(routerInfo.sushiswap);
    await strategy.connect(deployer).setCurveRouter(routerInfo.curve);
    await strategy.connect(deployer).setOracleRouter(oracleRouterAddress);

    // set strategy in controller
    let controllerFactory = await ethers.getContractFactory("SCompController");
    let controller = await controllerFactory.attach(controllerAddress);

    let tx = await controller.connect(deployer).approveStrategy(config.want, strategy.address);
    await tx.wait();

    tx = await controller.connect(deployer).setStrategy(config.want, strategy.address);
    tx.wait();

    // set timelock controller in strategy
    tx = await strategy.connect(deployer).setTimeLockController(timeLockControllerAddress);
    await tx.wait();


    await strategyTask.setSlippageSwapCrv(strategy.address, config.slippageSwapCrv);
    await strategyTask.setSlippageSwapCvx(strategy.address, config.slippageSwapCvx);
    await strategyTask.setSlippageLiquidity(strategy.address, config.slippageLiquidity);

    await strategyTask.setTokenSwapPath(strategy.address, config.crvSwapPath);
    await strategyTask.setTokenSwapPath(strategy.address, config.cvxSwapPath);

    let timeUpdate = 100000000
    let crvFeed = await oracleRouterTask.getFeed(oracleRouterAddress, tokenInfo.crv.address);
    if (crvFeed[0].toString().toUpperCase() == ethers.constants.AddressZero.toString().toUpperCase()) {
        await oracleRouterTask.addFeed(oracleRouterAddress, tokenInfo.crv.address, oracleInfo.crv_usd.address, 0, 86424, false)
    }
    let cvxFeed = await oracleRouterTask.getFeed(oracleRouterAddress, tokenInfo.cvx.address);
    if (cvxFeed[0].toString().toUpperCase() == ethers.constants.AddressZero.toString().toUpperCase()) {
        await oracleRouterTask.addFeed(oracleRouterAddress, tokenInfo.cvx.address, oracleInfo.cvx_usd.address, 0, 86424,false)
    }
    await oracleRouterTask.addFeed(oracleRouterAddress, config.tokenCompound, config.feed, config.priceAdmin, config.timeUpdate, true)

}
async function setSlippageSwapCrv(strategyAddress: string, newSlippage: string): Promise<void> {
    let strategy: Contract = await getStrategy(strategyAddress)

    const [deployer] = await ethers.getSigners();
    let tx = await strategy.connect(deployer).setSlippageSwapCrv(newSlippage);
    await tx.wait();

}
async function setSlippageSwapCvx(strategyAddress: string, newSlippage: string): Promise<void> {
    let strategy: Contract = await getStrategy(strategyAddress)

    const [deployer] = await ethers.getSigners();
    let tx = await strategy.connect(deployer).setSlippageSwapCvx(newSlippage);
    await tx.wait();

}

async function setSlippageLiquidity(strategyAddress: string, newSlippage: string): Promise<void> {
    let strategy: Contract = await getStrategy(strategyAddress)

    const [deployer] = await ethers.getSigners();
    let tx = await strategy.connect(deployer).setSlippageLiquidity(newSlippage);
    await tx.wait();

}
async function setTokenSwapPath(strategyAddress: string, namePath: string): Promise<void> {
    let strategy: Contract = await getStrategy(strategyAddress)

    const [deployer] = await ethers.getSigners();

    let infoSwap = require("../../info/bestQuote/"+namePath+".json");

    let indexTokenOut =
        infoSwap.swapType == 3 ?
        infoSwap.coinPath.indexOf(ethers.constants.AddressZero) > 0 ?
            infoSwap.coinPath.indexOf(ethers.constants.AddressZero) -1 :
            infoSwap.coinPath.length -1 : infoSwap.coinPath.length - 1;
    let tokenIn = infoSwap.coinPath[0];
    let tokenOut = infoSwap.coinPath[indexTokenOut];

    let tx = await strategy.connect(deployer).setTokenSwapPath(
        tokenIn, tokenOut,
        infoSwap.coinPath, infoSwap.feePath, infoSwap.swapParams, infoSwap.poolAddress, infoSwap.swapType);
    await tx.wait();

}

async function getTokenSwapPath(strategyAddress: string, tokenIn: string, tokenOut: string): Promise<any> {
    let strategy: Contract = await getStrategy(strategyAddress)

    return await strategy.swapPaths(tokenIn, tokenOut);
}

async function harvest(strategyAddress: string): Promise<void> {
    let strategy: Contract = await getStrategy(strategyAddress)
    const [deployer] = await ethers.getSigners();
    let tx = await strategy.connect(deployer).harvest();
    await tx.wait();
}

async function proposeChangeFeeGovernance(timeLockController: Contract, strategyAddress: string, newFeeGovernance:any, minDelay: number): Promise<void> {
    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    let data = factoryStrategy.interface.encodeFunctionData("setPerformanceFeeGovernance", [newFeeGovernance]);

    let tx = await timeLockController.schedule(
        strategyAddress,
        0,
        data,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        ethers.utils.formatBytes32String("100"), // todo salt
        minDelay
    );
    await tx.wait();

}

async function executeChangeFeeStrategy(timeLockController: Contract, strategyAddress: string, newFeeGovernance:any): Promise<void> {

    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    let data = factoryStrategy.interface.encodeFunctionData("setPerformanceFeeGovernance", [newFeeGovernance]);

    let tx = await timeLockController.execute(
        strategyAddress,
        0,
        data,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        ethers.utils.formatBytes32String("100"),
    );
    await tx.wait();
}

async function getStrategy(strategyAddress: string): Promise<Contract> {
    let factory = await ethers.getContractFactory("SCompStrategyV1_0");
    return factory.attach(strategyAddress);
}

// VAULT FUNCTION
async function deposit(vaultAddress: string, accountOperator: SignerWithAddress, amountDeposit: any): Promise<void> {
    let vault = await getVault(vaultAddress);
    let tx = await vault.connect(accountOperator).deposit(amountDeposit);
    await tx.wait();
}

async function depositFor(vaultAddress: string, wantAddress: string, accountOperator: SignerWithAddress, accountReceiver: string, amountDeposit: any): Promise<void> {
    let vault = await getVault(vaultAddress);
    await erc20Task.approve(wantAddress, accountOperator, vaultAddress, amountDeposit);
    let tx = await vault.connect(accountOperator).depositFor(amountDeposit, accountReceiver);
    await tx.wait();
}

async function withdrawAll(vaultAddress: string, operator: SignerWithAddress): Promise<void> {
    let vault = await getVault(vaultAddress);
    let tx = await vault.connect(operator).withdrawAll();
    await tx.wait();
}

async function withdraw(vaultAddress: string, operator: SignerWithAddress, amountToWithdraw: any): Promise<void> {
    let vault = await getVault(vaultAddress);
    let tx = await vault.connect(operator).withdraw(amountToWithdraw);
    await tx.wait();
}

async function earn(vaultAddress: string, accountOperator: SignerWithAddress): Promise<void> {
    let vault = await getVault(vaultAddress);
    let tx = await vault.connect(accountOperator).earn();
    await tx.wait();
}

async function getVault(vaultAddress: string): Promise<Contract> {
    let factory = await ethers.getContractFactory("SCompVault");
    return factory.attach(vaultAddress);
}

// ONE CLICK FUNCTION
async function oneClickIn(oneClickV3Address: string, minMintAmount: any,
                          tokenIn: string, amountIn: any,
                          listAverageSwap: any, listPathData: string[],
                          listTypeSwap: any[], listAmountOutMin: any[], listRouterAddress: any[],
                          vault: string): Promise<void> {
    let oneClick = await getOneClickV3(oneClickV3Address)
    let oneClickParams : any = {
        listAverageSwap : listAverageSwap,
        listPathData : listPathData,
        listTypeSwap : listTypeSwap,
        listAmountOutMin : listAmountOutMin,
        listRouterAddress : listRouterAddress,
        minMintAmount : minMintAmount
    }
    await oneClick.OneClickIn(
        tokenIn, amountIn, vault, oneClickParams);
}

async function oneClickOut(oneClickV3Address: string, poolAddress: string, lpCurve: string,
                           tokenOut: string, amountIn: any, amountsOutMinCurve: any, removeLiquidityOneCoin: boolean,
                           listPathData: string[], listTypeSwap: any[], listAmountOutMin: any[], listRouterAddress: any[],
                           vault: string): Promise<void> {
    let oneClick = await getOneClickV3(oneClickV3Address)
    await oneClick.OneClickOut(
        poolAddress, lpCurve, tokenOut, amountIn, amountsOutMinCurve, removeLiquidityOneCoin, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault);
}

async function getOneClickV3(oneClickV3Address: string): Promise<Contract> {
    let factory = await ethers.getContractFactory("OneClickV3");
    return factory.attach(oneClickV3Address);
}

export interface ConfigStrategy {
    name: string;
    want: string;
    tokenCompound: string;
    tokenCompoundPosition: number;
    curveSwap: string;
    tokenDeposit: string;
    account1: string;
    account2: string;
    account3: string;
    pathAddLiquidityCurve: BigNumber[];
    baseRewardPool: string;
    pidPool: number;
    nElementPool: number;
    feeGovernance: number;
    feeStrategist: number;
    feeWithdraw: number;
    feeDeposit: number;
    crvSwapPath: string;
    cvxSwapPath: string;
    slippageSwapCrv: any;
    slippageSwapCvx: any;
    slippageLiquidity: any;
    amountToDepositVault: BigNumber;
    feed: string;
    timeUpdate: number;
    priceAdmin: BigNumber;
    versionStrategy: string;
}

async function getConfig(name: string): Promise<ConfigStrategy> {
    let config: ConfigStrategy;
    if (name == "3eur" ) { // no used to test before deploy
        config = {
            name: "3Eur",
            want: curveInfo.lp.threeEur,
            tokenCompound: tokenInfo.tetherEur.address,
            tokenCompoundPosition: 1,
            curveSwap: curveInfo.pool.threeEur,
            tokenDeposit: tokenInfo.tetherEur.address,
            account1: "0x8ff006ECdD4867F9670e8d724243f7E0619ABb66",
            account2: "0xc6fBD88378cF798f90B66084350fA38eed6a8645",
            account3: "0x103090A6141ae2F3cB1734F2D0D2D8f8924b3A5d",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("1000", tokenInfo.tetherEur.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPool: curveInfo.baseRewardPool.threeEur,
            pidPool: curveInfo.pid.threeEur,
            nElementPool: curveInfo.nCoins.threeEur,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_EURT",
            cvxSwapPath: "cvx_EURT",
            slippageSwapCrv: 100,
            slippageSwapCvx: 100,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("500"),
            feed: oracleInfo.tetherEur_usd.address,
            timeUpdate: oracleInfo.tetherEur_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0", 8),
            versionStrategy: "1.0"
        }
    }
    else if (name == "busd3crv" ) {
        config = {
            name: "Busd3Crv",
            want: curveInfo.lp.busd3crv,
            tokenCompound: tokenInfo.bUsd.address,
            tokenCompoundPosition: 0,
            curveSwap: curveInfo.pool.busd3crv,
            tokenDeposit: tokenInfo.bUsd.address,
            account1: "0xf6deeb3fd7f9ab00b8ba2b0428611bebb4740aab",
            account2: "0xf9211FfBD6f741771393205c1c3F6D7d28B90F03",
            account3: "0x0c01e95c161c3025d1874b5734c250449036b32a",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.bUsd.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPool: curveInfo.baseRewardPool.busd3crv,
            pidPool: curveInfo.pid.busd3crv,
            nElementPool: curveInfo.nCoins.busd3crv,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_BUSD",
            cvxSwapPath: "cvx_BUSD",
            slippageSwapCrv: 100,
            slippageSwapCvx: 100,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("500"),
            feed: oracleInfo.busd_usd.address,
            timeUpdate: oracleInfo.busd_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0", 8),
            versionStrategy: "1.0"
        }
    }
    else if (name == "dola3crv" ) { // no used to test before deploy
        config = {
            name: "Dola3Crv",
            want: curveInfo.lp.dola3crv,
            tokenCompound: tokenInfo.dola.address,
            tokenCompoundPosition: 0,
            curveSwap: curveInfo.pool.dola3crv,
            tokenDeposit: tokenInfo.dola.address,
            account1: "0xe95BFf25da7B95F7dC60693F1dEf6Fe9200aeb39",
            account2: "0x80266b1e3f0C2cAdAE65A4Ef5Df20f3DF3707FfB",
            account3: "0xBB76eB024BE5D3A84f4CD82B6D3F5327f2778DfF",
            baseRewardPool: curveInfo.baseRewardPool.dola3crv,
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.dola.decimals), ethers.utils.parseUnits("0", 18)],
            pidPool: curveInfo.pid.dola3crv,
            nElementPool: curveInfo.nCoins.dola3crv,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_DOLA",
            cvxSwapPath: "cvx_DOLA",
            slippageSwapCrv: 100,
            slippageSwapCvx: 100,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("500"),
            feed: oracleInfo.dola_usd.address,
            timeUpdate: oracleInfo.dola_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("1", 8),
            versionStrategy: "1.1"
        }
    }
    else if (name == "euroc3crv" ) {
        config = {
            name: "EuroC3Crv",
            want: curveInfo.lp.euroc3crv,
            tokenCompound: tokenInfo.euroC.address,
            curveSwap: curveInfo.pool.euroc3crv,
            tokenDeposit: tokenInfo.euroC.address,
            account1: "0x23a8f11291462aa71a7cf104c1b7894c77047493",
            account2: "0xffc78585108382a7ad1a6786512a3b53847c7c74",
            account3: "0x0697FDd0b945e327882d787C8eD8afB5a8565A7d",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.euroC.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPool: curveInfo.baseRewardPool.euroc3crv,
            pidPool: curveInfo.pid.euroc3crv,
            nElementPool: curveInfo.nCoins.euroc3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_EUROC",
            cvxSwapPath: "cvx_EUROC",
            slippageSwapCrv: 100,
            slippageSwapCvx: 300,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("250"),
            feed: oracleInfo.euroC_usd.address,
            timeUpdate: oracleInfo.euroC_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0.95", 8),
            versionStrategy: "1.2"
        }
    }
    else if (name == "frax3crv" ) {
        config = {
            name: "Frax3Crv",
            want: curveInfo.lp.frax3crv,
            tokenCompound: tokenInfo.frax.address,
            curveSwap: curveInfo.pool.frax3crv,
            tokenDeposit: tokenInfo.frax.address,
            account1: "0xa09427e2DB1844b0d5D9b8be9cFaA308d6cA893D",
            account2: "0x499f39d4861f214808376C890aA7Cf6E424fb05B",
            account3: "0x4eAcf42d898b977973F1fd8448f6035dC44ce4D0",
            baseRewardPool: curveInfo.baseRewardPool.frax3crv,
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.frax.decimals), ethers.utils.parseUnits("0", 18)],
            pidPool: curveInfo.pid.frax3crv,
            nElementPool: curveInfo.nCoins.frax3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_FRAX",
            cvxSwapPath: "cvx_FRAX",
            slippageSwapCrv: 200,
            slippageSwapCvx: 200,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("1000"),
            feed: oracleInfo.frax_usd.address,
            timeUpdate: oracleInfo.frax_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0", 8),
            versionStrategy: "1.0"
        }
    }
    else if (name == "fraxusdc" ) {
        config = {
            name: "FraxUsdc",
            want: curveInfo.lp.fraxUsdc,
            tokenCompound: tokenInfo.usdc.address,
            tokenCompoundPosition: 1,
            crvSwapPath: "crv_USDC",
            cvxSwapPath: "cvx_USDC",
            feed: oracleInfo.usdc_usd.address,
            timeUpdate: oracleInfo.usdc_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0", 8),
            curveSwap: curveInfo.pool.fraxUsdc,
            tokenDeposit: tokenInfo.usdc.address,
            account1: "0x4B5FC353524C30A1C5C215AE9BC315d6dA5BDA3c",
            account2: "0x2983a7225ed34C73F97527F51a90CdDeD605CBf5",
            account3: "0x664d8F8F2417F52CbbF5Bd82Ba82EEfc58a87f07",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("2000", tokenInfo.usdc.decimals)],
            baseRewardPool: curveInfo.baseRewardPool.fraxUsdc,
            pidPool: curveInfo.pid.fraxUsdc,
            nElementPool: curveInfo.nCoins.fraxUsdc,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            slippageSwapCrv: 300,
            slippageSwapCvx: 300,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("10000"),
            versionStrategy: "1.1"
        }
    }
    else if (name == "ibeurseur" ) {
        config = {
            name: "ibEurSEur",
            want: curveInfo.lp.ibEurSEur,
            tokenCompound: tokenInfo.ibEur.address,
            curveSwap: curveInfo.pool.ibEurSEur,
            tokenDeposit: tokenInfo.ibEur.address,
            account1: "0xF49B3852419160376E19053785A3f09cF47e0e15",
            account2: "0x6bBAD66717C4dB3f83b76cfC7a546f3487418ddB",
            account3: "0x4eAcf42d898b977973F1fd8448f6035dC44ce4D0",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.ibEur.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPool: curveInfo.baseRewardPool.ibEurSEur,
            pidPool: curveInfo.pid.ibEurSEur,
            nElementPool: curveInfo.nCoins.ibEurSEur,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_ibEUR",
            cvxSwapPath: "cvx_ibEUR",
            slippageSwapCrv: 100,
            slippageSwapCvx: 100,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("500"),
            feed: oracleInfo.ibEur_usd.address,
            timeUpdate: oracleInfo.ibEur_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("1.10", 8),
            versionStrategy: "1.1"
        }
    }
    else if (name == "mim3crv" ) {
        config = {
            name: "Mim3Crv",
            want: curveInfo.lp.mim3crv,
            tokenCompound: tokenInfo.mim.address,
            curveSwap: curveInfo.pool.mim3crv,
            tokenDeposit: tokenInfo.mim.address,
            account1: "0xd7efcbb86efdd9e8de014dafa5944aae36e817e4",
            account2: "0x2bbdca89491e6f0c0f49412d38d893aea394fd02",
            account3: "0x25431341A5800759268a6aC1d3CD91C029D7d9CA",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.mim.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPool: curveInfo.baseRewardPool.mim3crv,
            pidPool: curveInfo.pid.mim3crv,
            nElementPool: curveInfo.nCoins.mim3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_MIM",
            cvxSwapPath: "cvx_MIM",
            slippageSwapCrv: 200,
            slippageSwapCvx: 200,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("500"),
            feed: oracleInfo.mim_usd.address,
            timeUpdate: oracleInfo.mim_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0", 8),
            versionStrategy: "1.0"
        }
    }
    else if (name == "tusd3crv" ) {
        config = {
            name: "Tusd3Crv",
            want: curveInfo.lp.tusd3crv,
            tokenCompound: tokenInfo.tusd.address,
            curveSwap: curveInfo.pool.tusd3crv,
            tokenDeposit: tokenInfo.tusd.address,
            account1: "0x270cd0b43f6fE2512A32597C7A05FB01eE6ec8E1",
            account2: "0x662353d1A53C88c85E546d7C4A72CE8fE1018e72",
            account3: "0x5aC8D87924255A30FEC53793c1e976E501d44c78",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.tusd.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPool: curveInfo.baseRewardPool.tusd3crv,
            pidPool: curveInfo.pid.tusd3crv,
            nElementPool: curveInfo.nCoins.tusd3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_TUSD",
            cvxSwapPath: "cvx_TUSD",
            slippageSwapCrv: 100,
            slippageSwapCvx: 100,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("500"),
            feed: oracleInfo.tusd_usd.address,
            timeUpdate: oracleInfo.tusd_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0", 8),
            versionStrategy: "1.0"
        }
    }
    else if (name == "usdd3crv" ) {
        config = {
            name: "Usdd3Crv",
            want: curveInfo.lp.usdd3crv,
            tokenCompound: tokenInfo.usdd.address,
            curveSwap: curveInfo.pool.usdd3crv,
            tokenDeposit: tokenInfo.usdd.address,
            account1: "0x611F97d450042418E7338CBDd19202711563DF01",
            account2: "0xee5B5B923fFcE93A870B3104b7CA09c3db80047A",
            account3: "0x44aa0930648738B39a21d66C82f69E45B2ce3B47",
            baseRewardPool: curveInfo.baseRewardPool.usdd3crv,
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.mim.decimals), ethers.utils.parseUnits("0", 18)],
            pidPool: curveInfo.pid.usdd3crv,
            nElementPool: curveInfo.nCoins.usdd3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_USDD",
            cvxSwapPath: "cvx_USDD",
            slippageSwapCrv: 100,
            slippageSwapCvx: 200,
            slippageLiquidity: 200,
            amountToDepositVault: ethers.utils.parseEther("500"),
            feed: oracleInfo.usdd_usd.address,
            timeUpdate: oracleInfo.usdd_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0.99", 8),
            versionStrategy: "1.1"
        }
    }
    else if (name == "eurt3crv" ) {
        config = {
            name: "Eurt3crv",
            want: curveInfo.lp.eurt3crv,
            tokenCompound: tokenInfo.tetherEur.address,
            curveSwap: curveInfo.pool.eurt3crv,
            tokenDeposit: tokenInfo.tetherEur.address,
            account1: "0x331174A9067e864A61B2F87861CCf006eD3bC95D",
            account2: "0xc065653dD4fd6fD97E7134b7B6daAb6fC221FD23",
            account3: "0xdf7a990073845DA3567AA70B6db1Bf4bbB07B718",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("600", tokenInfo.tetherEur.decimals), ethers.utils.parseUnits("0", tokenInfo.tetherEur.decimals)],
            baseRewardPool: curveInfo.baseRewardPool.eurt3crv,
            pidPool: curveInfo.pid.eurt3crv,
            nElementPool: curveInfo.nCoins.eurt3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_EURT",
            cvxSwapPath: "cvx_EURT",
            slippageSwapCrv: 400,
            slippageSwapCvx: 300,
            slippageLiquidity: 300,
            amountToDepositVault: ethers.utils.parseEther("200"),
            feed: oracleInfo.tetherEur_usd.address,
            timeUpdate: oracleInfo.tetherEur_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0", 8),
            versionStrategy: "1.2"
        }
    }
    else if (name == "3pool" ) {
        config = {
            name: "3Pool",
            want: curveInfo.lp.threePool,
            tokenCompound: tokenInfo.tetherUsd.address,
            tokenCompoundPosition: 2,
            crvSwapPath: "crv_USDT",
            cvxSwapPath: "cvx_USDT",
            feed: oracleInfo.tetherUsd_usd.address,
            timeUpdate: oracleInfo.tetherUsd_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0", 8),
            curveSwap: curveInfo.pool.threePool,
            tokenDeposit: tokenInfo.tetherEur.address,
            account1: "0xD2c828D44e4331defE8b9ED949ADAF187f1dc85E",
            account2: "0x4486083589A063ddEF47EE2E4467B5236C508fDe",
            account3: "0x8FBf6366c6b162aed3245d38447C58f3f37DD240",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("600", tokenInfo.tetherEur.decimals), ethers.utils.parseUnits("0", tokenInfo.tetherEur.decimals)],
            baseRewardPool: curveInfo.baseRewardPool.threePool,
            pidPool: curveInfo.pid.threePool,
            nElementPool: curveInfo.nCoins.threePool,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            slippageSwapCrv: 300,
            slippageSwapCvx: 100,
            slippageLiquidity: 300,
            amountToDepositVault: ethers.utils.parseEther("200"),
            versionStrategy: "1.1"
        }
    }
    else if (name == "alusd3crv" ) {
        config = {
            name: "AlUsd3Crv",
            want: curveInfo.lp.alUsd3crv,
            tokenCompound: tokenInfo.alUsd.address,
            tokenCompoundPosition: 0,
            crvSwapPath: "crv_alUSD",
            cvxSwapPath: "cvx_alUSD",
            feed: oracleInfo.alUsd_usd.address,
            timeUpdate: oracleInfo.alUsd_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0.996", 8),
            curveSwap: curveInfo.pool.alUsd3crv,
            tokenDeposit: tokenInfo.alUsd.address,
            account1: "0xf824DE6Fa90fCaBe1F9E44B67B7AB02C89c3D216",
            account2: "0x43436C54D4d1b5c3bef23b58176b922bCB73fb9A",
            account3: "0x5cC3cB20B2531C4A6d59Bf37aac8aCD0e8D099d3",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("600", tokenInfo.alUsd.decimals), ethers.utils.parseUnits("0", tokenInfo.alUsd.decimals)],
            baseRewardPool: curveInfo.baseRewardPool.alUsd3crv,
            pidPool: curveInfo.pid.alUsd3crv,
            nElementPool: curveInfo.nCoins.alUsd3crv,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            slippageSwapCrv: 100,
            slippageSwapCvx: 200,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("500"),
            versionStrategy: "1.0"
        }
    }
    else if (name == "gusd3crv" ) {
        config = {
            name: "Gusd3Crv",
            want: curveInfo.lp.gusd3crv,
            tokenCompound: tokenInfo.gusd.address,
            tokenCompoundPosition: 0,
            crvSwapPath: "crv_GUSD",
            cvxSwapPath: "cvx_GUSD",
            feed: oracleInfo.gusd_usd.address,
            timeUpdate: oracleInfo.gusd_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0", 8),
            curveSwap: curveInfo.pool.gusd3crv,
            tokenDeposit: tokenInfo.gusd.address,
            account1: "0xB41742195962ca2D9886690AC2854aBf7B826090",
            account2: "0x5F46B95E1ee0d519E0Fd4F9bF23f3eC223f2e764",
            account3: "0xD02dCaFCA5a7e6512B5b872401b78E86a48fE75B",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("600", tokenInfo.gusd.decimals), ethers.utils.parseUnits("0", tokenInfo.gusd.decimals)],
            baseRewardPool: curveInfo.baseRewardPool.gusd3crv,
            pidPool: curveInfo.pid.gusd3crv,
            nElementPool: curveInfo.nCoins.gusd3crv,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            slippageSwapCrv: 100,
            slippageSwapCvx: 300,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("500"),
            versionStrategy: "1.1"
        }
    }
    else if (name == "ousd3crv" ) {
        config = {
            name: "Ousd3Crv",
            want: curveInfo.lp.ousd3crv,
            tokenCompound: tokenInfo.ousd.address,
            tokenCompoundPosition: 0,
            crvSwapPath: "crv_OUSD",
            cvxSwapPath: "cvx_OUSD",
            feed: oracleInfo.ousd_usd.address,
            timeUpdate: oracleInfo.ousd_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0.9985", 8),
            curveSwap: curveInfo.pool.ousd3crv,
            tokenDeposit: tokenInfo.ousd.address,
            account1: "0x7ABb2F489BaDB852F2A5693c62be03cF6D6fb281",
            account2: "0x4C21BD527C0D8b84Df6D8902308E26f8c8aAB466",
            account3: "0x4B0D1166dF6E41c47bc174829c9aA41304131eCC",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("600", tokenInfo.ousd.decimals), ethers.utils.parseUnits("0", tokenInfo.ousd.decimals)],
            baseRewardPool: curveInfo.baseRewardPool.ousd3crv,
            pidPool: curveInfo.pid.ousd3crv,
            nElementPool: curveInfo.nCoins.ousd3crv,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            slippageSwapCrv: 400,
            slippageSwapCvx: 1000,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("500"),
            versionStrategy: "1.0"
        }
    }
    else if (name == "usdceurs" ) {
        config = {
            name: "UsdcEurs",
            want: curveInfo.lp.usdcEurs,
            tokenCompound: tokenInfo.usdc.address,
            tokenCompoundPosition: 0,
            crvSwapPath: "crv_USDC",
            cvxSwapPath: "cvx_USDC",
            feed: oracleInfo.usdc_usd.address,
            timeUpdate: oracleInfo.usdc_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0", 8),
            curveSwap: curveInfo.pool.usdcEurs,
            tokenDeposit: tokenInfo.usdc.address,
            account1: "0x799fDB02e49c5B77FdDB4B271aDf11bf42DCA586",
            account2: "0xcF269308b782e9FF73634bA7DEd40A6C987831E9",
            account3: "0xEE3884CE7255a7b9022048488e235c716bC15Caf",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("600", tokenInfo.usdc.decimals), ethers.utils.parseUnits("0", tokenInfo.usdc.decimals)],
            baseRewardPool: curveInfo.baseRewardPool.usdcEurs,
            pidPool: curveInfo.pid.usdcEurs,
            nElementPool: curveInfo.nCoins.usdcEurs,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            slippageSwapCrv: 200,
            slippageSwapCvx: 400,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("500"),
            versionStrategy: "1.2"
        }
    }
    else if (name == "usdp3crv" ) { // harvest non funziona
        config = {
            name: "Usdp3Crv",
            want: curveInfo.lp.usdp3crv,
            tokenCompound: tokenInfo.usdp.address,
            tokenCompoundPosition: 0,
            crvSwapPath: "crv_USDP",
            cvxSwapPath: "cvx_USDP",
            feed: oracleInfo.usdp_usd.address,
            timeUpdate: oracleInfo.usdp_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0", 8),
            curveSwap: curveInfo.pool.usdp3crv,
            tokenDeposit: tokenInfo.usdp.address,
            account1: "0xdD942819f4BD672Fb757Fd7Ae90F56838a4F2785",
            account2: "0xC5a0D238075734bf1758a5d6FE6EDD6FB2f2E675",
            account3: "0x1a97a5a0063d837Fd3365E71E5bDc3894e833E6d",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("600", tokenInfo.usdp.decimals), ethers.utils.parseUnits("0", tokenInfo.usdp.decimals)],
            baseRewardPool: curveInfo.baseRewardPool.usdp3crv,
            pidPool: curveInfo.pid.usdp3crv,
            nElementPool: curveInfo.nCoins.usdp3crv,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            slippageSwapCrv: 1400,
            slippageSwapCvx: 1400,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("5000"),
            versionStrategy: "1.1"
        }
    }
    else if (name == "eusdfraxbp" ) {
        config = {
            name: "EusdFraxBp",
            want: curveInfo.lp.eusdFraxbp,
            tokenCompound: tokenInfo.eusd.address,
            tokenCompoundPosition: 0,
            crvSwapPath: "crv_eUSD",
            cvxSwapPath: "cvx_eUSD",
            feed: oracleInfo.eusd_usd.address,
            timeUpdate: oracleInfo.eusd_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0.9995", 8),
            curveSwap: curveInfo.pool.eusdFraxbp,
            tokenDeposit: tokenInfo.eusd.address,
            account1: "0x5180db0237291A6449DdA9ed33aD90a38787621c",
            account2: "0x3c28C42B24B7909c8292920929f083F60C4997A6",
            account3: "0x0FC60765Aa07969027740F2560045cBF4205E776",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("600", tokenInfo.eusd.decimals), ethers.utils.parseUnits("0", tokenInfo.eusd.decimals)],
            baseRewardPool: curveInfo.baseRewardPool.eusdFraxbp,
            pidPool: curveInfo.pid.eusdFraxbp,
            nElementPool: curveInfo.nCoins.eusdFraxbp,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            slippageSwapCrv: 100,
            slippageSwapCvx: 100,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("10000"),
            versionStrategy: "1.1"
        }
    }
    else if (name == "dolafraxbp" ) {
        config = {
            name: "DolaFraxBp",
            want: curveInfo.lp.dolaFraxbp,
            tokenCompound: tokenInfo.dola.address,
            tokenCompoundPosition: 0,
            crvSwapPath: "crv_DOLA",
            cvxSwapPath: "cvx_DOLA",
            feed: oracleInfo.dola_usd.address,
            timeUpdate: oracleInfo.dola_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("1", 8),
            curveSwap: curveInfo.pool.dolaFraxbp,
            tokenDeposit: tokenInfo.dola.address,
            account1: "0x5180db0237291A6449DdA9ed33aD90a38787621c",
            account2: "0xb3DE8A678A372D640347e52762b385baB4F896ce",
            account3: "0x40Bf6AfEA1CFfDF9C228c2624c9b3AE2c08972A1",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("600", tokenInfo.dola.decimals), ethers.utils.parseUnits("0", tokenInfo.dola.decimals)],
            baseRewardPool: curveInfo.baseRewardPool.dolaFraxbp,
            pidPool: curveInfo.pid.dolaFraxbp,
            nElementPool: curveInfo.nCoins.dolaFraxbp,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            slippageSwapCrv: 100,
            slippageSwapCvx: 200,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("5000"),
            versionStrategy: "1.1"
        }
    }
    else if (name == "ageureuroc" ) {
        config = {
            name: "AgEurEuroC",
            want: curveInfo.lp.agEurEuroC,
            tokenCompound: tokenInfo.agEur.address,
            tokenCompoundPosition: 0,
            crvSwapPath: "crv_agEUR",
            cvxSwapPath: "cvx_agEUR",
            feed: oracleInfo.agEur_usd.address,
            timeUpdate: oracleInfo.agEur_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0.9964", 8),
            curveSwap: curveInfo.pool.agEurEuroC,
            tokenDeposit: tokenInfo.agEur.address,
            account1: "0xaaC7359Fb5D39Db6C562cACe5E0947b591F16fF5",
            account2: "0x1Bc3EcbD82fF38BE70b77b7f21E502f1138C3D02",
            account3: "0x802eC985Fd4DFAFeEE70F228Fbc99709f752b73E",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("600", tokenInfo.agEur.decimals), ethers.utils.parseUnits("0", tokenInfo.agEur.decimals)],
            baseRewardPool: curveInfo.baseRewardPool.agEurEuroC,
            pidPool: curveInfo.pid.agEurEuroC,
            nElementPool: curveInfo.nCoins.agEurEuroC,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            slippageSwapCrv: 1200,
            slippageSwapCvx: 1300,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("5000"),
            versionStrategy: "1.1"
        }
    }
    else if (name == "ibeurusdc" ) {
        config = {
            name: "IbEurUsdc",
            want: curveInfo.lp.ibEurUsdc,
            tokenCompound: tokenInfo.usdc.address,
            tokenCompoundPosition: 1,
            crvSwapPath: "crv_USDC",
            cvxSwapPath: "cvx_USDC",
            feed: oracleInfo.usdc_usd.address,
            timeUpdate: oracleInfo.usdc_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0", 8),
            curveSwap: curveInfo.pool.ibEurUsdc,
            tokenDeposit: tokenInfo.usdc.address,
            account1: "0x2D407dDb06311396fE14D4b49da5F0471447d45C",
            account2: "0x5b63B4929094C6A68C39F787939B5B318C47272c",
            account3: "0x6F2D13506F6305cb7d8B9880B7dd4c6A7d8B6b16",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("600", tokenInfo.usdc.decimals), ethers.utils.parseUnits("0", tokenInfo.usdc.decimals)],
            baseRewardPool: curveInfo.baseRewardPool.ibEurUsdc,
            pidPool: curveInfo.pid.ibEurUsdc,
            nElementPool: curveInfo.nCoins.ibEurUsdc,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            slippageSwapCrv: 200,
            slippageSwapCvx: 200,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("5000"),
            versionStrategy: "1.2"
        }
    }
    else if (name == "ageureurteurs" ) {
        config = {
            name: "AgEurEurTEurS",
            want: curveInfo.lp.agEurEurtEurs,
            tokenCompound: tokenInfo.tetherEur.address,
            tokenCompoundPosition: 1,
            crvSwapPath: "crv_EURT",
            cvxSwapPath: "cvx_EURT",
            feed: oracleInfo.tetherEur_usd.address,
            timeUpdate: oracleInfo.tetherEur_usd.timeUpdate,
            priceAdmin: ethers.utils.parseUnits("0", 8),
            curveSwap: curveInfo.pool.agEurEurtEurs,
            tokenDeposit: tokenInfo.tetherEur.address,
            account1: "0x98DebD798afbC0641B3AA0AdE7443BC8B619261E",
            account2: "0x0dE5199779b43E13B3Bec21e91117E18736BC1A8",
            account3: "0xA2dEe32662F6243dA539bf6A8613F9A9e39843D3",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("600", tokenInfo.tetherEur.decimals), ethers.utils.parseUnits("0", tokenInfo.tetherEur.decimals)],
            baseRewardPool: curveInfo.baseRewardPool.agEurEurtEurs,
            pidPool: curveInfo.pid.agEurEurtEurs,
            nElementPool: curveInfo.nCoins.agEurEurtEurs,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            slippageSwapCrv: 200,
            slippageSwapCvx: 200,
            slippageLiquidity: 100,
            amountToDepositVault: ethers.utils.parseEther("5000"),
            versionStrategy: "1.1"
        }
    }
    else {
        config = {
            account1: "",
            account2: "",
            account3: "",
            slippageSwapCrv: 0,
            slippageSwapCvx: 0,
            slippageLiquidity: 0,
            amountToDepositVault: ethers.utils.parseEther("0"),
            baseRewardPool: "",
            crvSwapPath: "",
            curveSwap: "",
            cvxSwapPath: "",
            feeDeposit: 0,
            feeGovernance: 0,
            feeStrategist: 0,
            feeWithdraw: 0,
            feed: "",
            nElementPool: 0,
            name: "",
            pathAddLiquidityCurve: [],
            pidPool: 0,
            priceAdmin: ethers.utils.parseEther("0"),
            timeUpdate: 0,
            tokenCompound: "",
            tokenCompoundPosition: 0,
            tokenDeposit: "",
            versionStrategy: "",
            want: ""
        }
    }
    return config;
}

export const deployScompTask = {
    getConfig: async function (name: string): Promise<ConfigStrategy> {
        return await getConfig(name);
    },
    deploySCompToken: async function (): Promise<Contract>{
        return await deploySCompToken();
    },
    deployVe: async function (sCompTokenAddress: string): Promise<Contract>{
        return await deployVe(sCompTokenAddress);
    },
    deployMasterchef: async function (sCompTokenAddress: string, veAddress: string): Promise<Contract>{
        return await deployMasterchef(sCompTokenAddress, veAddress);
    },
    deployFeeDistribution: async function (sCompTokenAddress: string, veAddress: string, admin: string, emergencyReturn: string): Promise<Contract>{
        return await deployFeeDistribution(sCompTokenAddress, veAddress, admin, emergencyReturn);
    },
    deploySurplusConverterV2: async function (feeDistributionAddress: string, whitelisted: string, governor: string, guardians: string[]): Promise<Contract>{
        return await deploySurplusConverterV2(feeDistributionAddress, whitelisted, governor, guardians);
    },
    deployController: async function (governance: string, strategist: string, rewards: string): Promise<Contract>{
        return await deployController(governance, strategist, rewards);
    },
    deployTimeLockController: async function (proposer: string[], executor: string[]): Promise<Contract>{
        return await deployTimeLockController(proposer, executor);
    },
    deployOracleRouter: async function (): Promise<Contract>{
        return await deployOracleRouter();
    },
    deployOneClick: async function (): Promise<Contract>{
        return await deployOneClick();
    },
    deployVault: async function (controllerAddress: string, wantAddress: string, treasuryFee: string, feeDeposit: any): Promise<Contract>{
        return await deployVault(controllerAddress, wantAddress, treasuryFee, feeDeposit);
    },
    deployStrategy: async function (nameStrategy: string, governance: string, strategist: string,
                                    controller: string, wantAddress: string, tokenCompound: string,
                                    tokenCompoundPosition: number, pidPool: number, feeGovernance: number, feeStrategist: number,
                                    feeWithdraw: number, curveSwapAddress: string, nElementPool: number , versionStrategy: string): Promise<Contract> {
        return await deployStrategy(nameStrategy, governance, strategist, controller, wantAddress, tokenCompound,
                                    tokenCompoundPosition, pidPool, feeGovernance, feeStrategist, feeWithdraw, curveSwapAddress, nElementPool,
                                    versionStrategy);
    },
};

export const oneClickTask = {
    oneClickIn: async function (oneClickV3Address: string, minMintAmount: any,
                                tokenIn: string, amountIn: any,
                                listAverageSwap: any, listPathData: string[],
                                listTypeSwap: any[],
                                listAmountOutMin: any[], listRouterAddress: any[], vault: string
    ): Promise<void>{
        return await oneClickIn(oneClickV3Address, minMintAmount,
            tokenIn, amountIn,
            listAverageSwap, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault);
    },
    oneClickOut: async function (oneClickV3Address: string, poolAddress: string, lpCurve: string,
                                 tokenOut: string, amountIn: any, amountsOutMinCurve: any, removeLiquidityOneCoin: boolean,
                                 listPathData: string[], listTypeSwap: any[], listAmountOutMin: any[], listRouterAddress: any[],
                                 vault: string
    ): Promise<void>{
        return await oneClickOut(oneClickV3Address, poolAddress, lpCurve, tokenOut, amountIn,
            amountsOutMinCurve, removeLiquidityOneCoin, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault);
    },
};

export const strategyTask = {
    setConfig: async function (strategyAddress: string, config: ConfigStrategy, controllerAddress: string, oracleRouterAddress: string, timeLockControllerAddress: string): Promise<void>{
        return await setConfig(strategyAddress, config, controllerAddress, oracleRouterAddress, timeLockControllerAddress);
    },
    setSlippageSwapCrv: async function (strategyAddress: string, newSlippage: string): Promise<void>{
        return await setSlippageSwapCrv(strategyAddress, newSlippage);
    },
    setSlippageSwapCvx: async function (strategyAddress: string, newSlippage: string): Promise<void>{
        return await setSlippageSwapCvx(strategyAddress, newSlippage);
    },
    setSlippageLiquidity: async function (strategyAddress: string, newSlippage: string): Promise<void>{
        return await setSlippageLiquidity(strategyAddress, newSlippage);
    },
    setTokenSwapPath: async function (strategyAddress: string, namePath: string): Promise<void>{
        return await setTokenSwapPath(strategyAddress, namePath);
    },
    getTokenSwapPath: async function (strategyAddress: string, tokenIn: string, tokenOut: string): Promise<void>{
        return await getTokenSwapPath(strategyAddress, tokenIn, tokenOut);
    },
    harvest: async function (strategyAddress: string): Promise<void>{
        return await harvest(strategyAddress);
    },
    proposeChangeFeeStrategy: async function (timeLockController: Contract, strategyAddress: string, newFeeGovernance:any, minDelay: number): Promise<void>{
        return await proposeChangeFeeGovernance(timeLockController, strategyAddress, newFeeGovernance, minDelay);
    },
    executeChangeFeeStrategy: async function (timeLockController: Contract, strategyAddress: string, newFeeGovernance:any): Promise<void>{
        return await executeChangeFeeStrategy(timeLockController, strategyAddress, newFeeGovernance);
    },
};

export const vaultTask = {
    deposit: async function (vaultAddress: string, accountOperator: SignerWithAddress, amountDeposit: any): Promise<void>{
        return await deposit(vaultAddress, accountOperator, amountDeposit);
    },
    depositFor: async function (vaultAddress: string, wantAddress: string, accountOperator: SignerWithAddress, accountReceiver: string, amountDeposit: any): Promise<void>{
        return await depositFor(vaultAddress, wantAddress, accountOperator, accountReceiver, amountDeposit);
    },
    withdrawAll: async function (vaultAddress: string, operator: SignerWithAddress): Promise<void>{
        return await withdrawAll(vaultAddress, operator);
    },
    withdraw: async function (vaultAddress: string, operator: SignerWithAddress, amountToWithdraw: any): Promise<void>{
        return await withdraw(vaultAddress, operator, amountToWithdraw);
    },
    earn: async function (vaultAddress: string, accountOperator: SignerWithAddress): Promise<void> {
        return await earn(vaultAddress, accountOperator);
    },
};

