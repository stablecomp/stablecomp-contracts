import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import fs from "fs";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {erc20Task} from "./standard/erc20Task";
const { run, ethers } = hardhat;

const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');
const routerInfo = require('../../info/address_mainnet/routerAddress.json');
const curveInfo = require('../../info/address_mainnet/curveAddress.json');
const boosterABI = require('../../info/abi/booster.json');

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

    console.log("Masterchef contract deployed to address: ", masterchefScomp.address);

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

async function deployStrategy(nameStrategy: string, governanceAddress: string, surplusConverterV2Address: string,
                              controllerAddress: string, wantAddress: string, tokenCompoundAddress: string,
                              tokenCompoundPosition: number, pidPool: number, feeGovernance: number, feeStrategist: number,
                              feeWithdraw: number, curveSwapAddress: string, nElementPool: number ,
                              timeLockControllerAddress: string): Promise<Contract> {

    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    let sCompStrategy = await factoryStrategy.deploy(
        nameStrategy,
        governanceAddress,
        surplusConverterV2Address,
        controllerAddress,
        wantAddress,
        tokenCompoundAddress,
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
                    governance: governanceAddress,
                    strategist: surplusConverterV2Address,
                    controller: controllerAddress,
                    want: wantAddress,
                    tokenCompound: tokenCompoundAddress,
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

    const [deployer] = await ethers.getSigners();

    // set router in strategy
    await sCompStrategy.connect(deployer).setUniswapV3Router(routerInfo.uniswapV3);
    await sCompStrategy.connect(deployer).setUniswapV2Router(routerInfo.uniswapV2);
    await sCompStrategy.connect(deployer).setSushiswapRouter(routerInfo.sushiswap);
    await sCompStrategy.connect(deployer).setQuoterUniswap(routerInfo.quoter);


    // set strategy in controller
    let sCompControllerFactory = await ethers.getContractFactory("SCompController");
    let sCompController = await sCompControllerFactory.attach(controllerAddress);

    let tx = await sCompController.connect(deployer).approveStrategy(wantAddress, sCompStrategy.address);
    await tx.wait();

    tx = await sCompController.connect(deployer).setStrategy(wantAddress, sCompStrategy.address);
    tx.wait();

    // set timelock controller in strategy
    tx = await sCompStrategy.connect(deployer).setTimeLockController(timeLockControllerAddress);
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
            address: sCompStrategy.address,
            constructorArguments: [
                nameStrategy,
                governanceAddress,
                surplusConverterV2Address,
                controllerAddress,
                wantAddress,
                tokenCompoundAddress,
                pidPool,
                [feeGovernance, feeStrategist, feeWithdraw],
                {swap: curveSwapAddress, tokenCompoundPosition: tokenCompoundPosition, numElements: nElementPool}
            ],
        });
    }

    return sCompStrategy;
}

async function writeAddressInJson(folder: string, nameFile: string, jsonData: any): Promise<void> {

    let addressPath = "./address/"
    if (!fs.existsSync(addressPath)) {
        fs.mkdirSync(addressPath);
    }

    let networkPath = "./address/"+ hardhat.network.name
    if (!fs.existsSync(networkPath)) {
        fs.mkdirSync(networkPath);
    }

    let folderPath = "./address/"+ hardhat.network.name +"/"+ folder +"/"
    if (!fs.existsSync(folderPath)){
        await fs.mkdirSync(folderPath);
        let folderPathBackup = "./address/"+ hardhat.network.name +"/"+folder+"/backup"
        await fs.mkdirSync(folderPathBackup);
    }

    let path = folderPath + nameFile+".json"

    if (fs.existsSync(path)){
        let pathRename = "./address/"+ hardhat.network.name +"/"+ folder +"/backup/"+ nameFile +"_"+ Date.now() +".json"
        await fs.rename(path, pathRename, function(res:any) {});
    }

    let data = JSON.stringify(jsonData);
    fs.writeFileSync(path, data);
}

// STRATEGIES FUNCTION
async function setTokenSwapPathConfig(strategyAddress: string, namePath: string): Promise<void> {
    let strategy: Contract = await getStrategy(strategyAddress)

    const [deployer] = await ethers.getSigners();

    let infoSwap = require("../../info/bestQuote/"+namePath+".json");

    if (infoSwap.versionProtocol == "V2") {
        let tx = await strategy.connect(deployer).setTokenSwapPathV2(
            infoSwap.coinPath[0], infoSwap.coinPath[infoSwap.coinPath.length -1],
            infoSwap.coinPath, infoSwap.routerIndex);
        await tx.wait();
    } else {
        let tx = await strategy.connect(deployer).setTokenSwapPathV3(
            infoSwap.coinPath[0], infoSwap.coinPath[infoSwap.coinPath.length -1],
            infoSwap.coinPath, infoSwap.feePath, infoSwap.feePath.length);
        await tx.wait();
    }
}


// STRATEGIES FUNCTION
/*
version protocol accepted: "V2", "V3"
if V2 :
    - feePath can be empty
    - routerIndex:
        - 0 -> uniswap
        - 1 -> sushiswap
if V3 :
    - router index can be empty
 */
async function setTokenSwapPathManual(strategyAddress: string, coinPath: string[], feePath: any[], versionProtocol: any, routerIndex: number): Promise<void> {
    let strategy: Contract = await getStrategy(strategyAddress)

    const [deployer] = await ethers.getSigners();

    if (versionProtocol == "V2") {
        let tx = await strategy.connect(deployer).setTokenSwapPathV2(
            coinPath[0], coinPath[coinPath.length -1],
            [coinPath], routerIndex);

        await tx.wait();
    } else {
        let tx = await strategy.connect(deployer).setTokenSwapPathV3(
            coinPath[0], coinPath[coinPath.length -1],
            coinPath, feePath, feePath.length);
        await tx.wait();
    }
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
    let factory = await ethers.getContractFactory("SCompStrategyV1");
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

// BOOSTER FUNCTION
async function earnmarkReward(pidPool: any): Promise<void> {
    const [deployer] = await ethers.getSigners();
    let boosterContract = await getBoosterContract();
    await boosterContract.connect(deployer).earmarkRewards(pidPool);
}

async function getBoosterContract(): Promise<Contract> {
    return await new ethers.Contract(curveInfo.boosterAddress, boosterABI, ethers.provider);

}


export const deployScompTask = {
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
    deployVault: async function (controllerAddress: string, wantAddress: string, treasuryFee: string, feeDeposit: any): Promise<Contract>{
        return await deployVault(controllerAddress, wantAddress, treasuryFee, feeDeposit);
    },
    deployStrategy: async function (nameStrategy: string, governanceAddress: string, surplusConverterV2Address: string,
                                    controllerAddress: string, wantAddress: string, tokenCompoundAddress: string,
                                    tokenCompoundPosition: number, pidPool: number, feeGovernance: number, feeStrategist: number,
                                    feeWithdraw: number, curveSwapAddress: string, nElementPool: number ,
                                    timeLockControllerAddress: string): Promise<Contract> {
        return await deployStrategy(nameStrategy, governanceAddress, surplusConverterV2Address, controllerAddress, wantAddress, tokenCompoundAddress,
                                    tokenCompoundPosition, pidPool, feeGovernance, feeStrategist, feeWithdraw, curveSwapAddress, nElementPool,
                                    timeLockControllerAddress);
    },
};

export const strategyTask = {
    setTokenSwapPathConfig: async function (strategyAddress: string, namePath: string): Promise<void>{
        return await setTokenSwapPathConfig(strategyAddress, namePath);
    },
    setTokenSwapPathManual: async function (strategyAddress: string, coinPath: string[], feePath: any[], versionProtocol: any, routerIndex: number): Promise<void>{
        return await setTokenSwapPathManual(strategyAddress, coinPath, feePath, versionProtocol, routerIndex);
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

export const boosterTask = {
    earnmarkReward: async function (pid: any): Promise<void>{
        return await earnmarkReward(pid);
    },
};
