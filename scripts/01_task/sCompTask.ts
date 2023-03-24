import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import fs from "fs";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {erc20Task} from "./standard/erc20Task";
const { run, ethers } = hardhat;

const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');
const routerInfo = require('../../info/address_mainnet/routerAddress.json');
const curveInfo = require('../../info/address_mainnet/curveAddress.json');
const oracleInfo = require('../../info/address_mainnet/oracleAddress.json');
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
                              controllerAddress: string, oracleRouterAddress: string, wantAddress: string, tokenCompoundAddress: string,
                              tokenCompoundPosition: number, pidPool: number, feeGovernance: number, feeStrategist: number,
                              feeWithdraw: number, curveSwapAddress: string, nElementPool: number ,
                              timeLockControllerAddress: string, versionStrategy: string): Promise<Contract> {

    let factoryStrategy;
    if (versionStrategy == "1.1") {
        factoryStrategy = await ethers.getContractFactory("SCompStrategyV1_1")
    } else {
        factoryStrategy = await ethers.getContractFactory("SCompStrategyV1_0")
    }

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
    await sCompStrategy.connect(deployer).setOracleRouter(oracleRouterAddress);

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

    let isSwapV2 = infoSwap.versionProtocol == "V2"

    let tx = await strategy.connect(deployer).setTokenSwapPath(
        infoSwap.coinPath[0], infoSwap.coinPath[infoSwap.coinPath.length -1],
        infoSwap.coinPath, infoSwap.feePath, infoSwap.routerIndex, isSwapV2);
    await tx.wait();

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

// BOOSTER FUNCTION
async function earnmarkReward(pidPool: any): Promise<void> {
    const [deployer] = await ethers.getSigners();
    let boosterContract = await getBoosterContract();
    await boosterContract.connect(deployer).earmarkRewards(pidPool);
}

async function getBoosterContract(): Promise<Contract> {
    return await new ethers.Contract(curveInfo.boosterAddress, boosterABI, ethers.provider);

}

async function getConfig(name: string): Promise<any> {
    if (name == "3eur" ) {
        return {
            nameStrategy: "3Eur",
            wantAddress: curveInfo.lp.threeEur,
            tokenCompoundAddress: tokenInfo.tetherEur.address,
            tokenCompoundPosition: 1,
            curveSwapAddress: curveInfo.pool.threeEur,
            tokenDepositAddress: tokenInfo.tetherEur.address,
            accountDepositAddress1: "0x8ff006ECdD4867F9670e8d724243f7E0619ABb66",
            accountDepositAddress2: "0xc6fBD88378cF798f90B66084350fA38eed6a8645",
            accountDepositAddress3: "0x103090A6141ae2F3cB1734F2D0D2D8f8924b3A5d",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("1000", tokenInfo.tetherEur.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.threeEur,
            pidPool: curveInfo.pid.threeEur,
            nElementPool: curveInfo.nCoins.threeEur,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_eurT",
            cvxSwapPath: "cvx_eurT",
            amountToDepositVault: ethers.utils.parseEther("500"),
            feedAddress: oracleInfo.tetherEur_usd,
            versionStrategy: "1.0"
        }
    }
    else if (name == "busd3crv" ) {
        return {
            nameStrategy: "Busd3Crv",
            wantAddress: curveInfo.lp.busd3crv,
            tokenCompoundAddress: tokenInfo.busd.address,
            tokenCompoundPosition: 0,
            curveSwapAddress: curveInfo.pool.busd3crv,
            tokenDepositAddress: tokenInfo.busd.address,
            accountDepositAddress1: "0xf6deeb3fd7f9ab00b8ba2b0428611bebb4740aab",
            accountDepositAddress2: "0xf9211FfBD6f741771393205c1c3F6D7d28B90F03",
            accountDepositAddress3: "0x0c01e95c161c3025d1874b5734c250449036b32a",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.busd.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.busd3crv,
            pidPool: curveInfo.pid.busd3crv,
            nElementPool: curveInfo.nCoins.busd3crv,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_busd",
            cvxSwapPath: "cvx_busd",
            amountToDepositVault: ethers.utils.parseEther("500"),
            feedAddress: oracleInfo.busd_usd,
            versionStrategy: "1.0"
        }
    }
    else if (name == "dola3crv" ) {
        return {
            nameStrategy: "Dola3Crv",
            wantAddress: curveInfo.lp.dola3crv,
            tokenCompoundAddress: tokenInfo.dola.address,
            tokenCompoundPosition: 0,
            curveSwapAddress: curveInfo.pool.dola3crv,
            tokenDepositAddress: tokenInfo.dola.address,
            accountDepositAddress1: "0x16ec2aea80863c1fb4e13440778d0c9967fc51cb",
            accountDepositAddress2: "0x35Ba260cED73d3d8A880BF6B0912EdFB87BfA04C",
            accountDepositAddress3: "0x1ef6d167a6c03cad53a3451fd526a5f434e70b91",
            baseRewardPoolAddress: curveInfo.baseRewardPool.dola3crv,
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.dola.decimals), ethers.utils.parseUnits("0", 18)],
            pidPool: curveInfo.pid.dola3crv,
            nElementPool: curveInfo.nCoins.dola3crv,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_dola",
            cvxSwapPath: "cvx_dola",
            amountToDepositVault: ethers.utils.parseEther("500"),
            feedAddress: oracleInfo.dola_usd,
            versionStrategy: "1.0"
        }
    }
    else if (name == "euroc3crv" ) {
        return {
            nameStrategy: "EuroC3Crv",
            wantAddress: curveInfo.lp.euroc3crv,
            tokenCompoundAddress: tokenInfo.euroC.address,
            curveSwapAddress: curveInfo.pool.euroc3crv,
            tokenDepositAddress: tokenInfo.euroC.address,
            accountDepositAddress1: "0x23a8f11291462aa71a7cf104c1b7894c77047493",
            accountDepositAddress2: "0xffc78585108382a7ad1a6786512a3b53847c7c74",
            accountDepositAddress3: "0x0697FDd0b945e327882d787C8eD8afB5a8565A7d",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.euroC.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.euroc3crv,
            pidPool: curveInfo.pid.euroc3crv,
            nElementPool: curveInfo.nCoins.euroc3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_euroC",
            cvxSwapPath: "cvx_euroC",
            amountToDepositVault: ethers.utils.parseEther("250"),
            feedAddress: oracleInfo.euroC_usd,
            versionStrategy: "1.1"
        }
    }
    else if (name == "frax3crv" ) {
        return {
            nameStrategy: "Frax3Crv",
            wantAddress: curveInfo.lp.frax3crv,
            tokenCompoundAddress: tokenInfo.frax.address,
            curveSwapAddress: curveInfo.pool.frax3crv,
            tokenDepositAddress: tokenInfo.frax.address,
            accountDepositAddress1: "0x0Ad1763dDDd2Aa9284b3828C19eED0A1960F362b",
            accountDepositAddress2: "0x4C569Fcdd8b9312B8010Ab2c6D865c63C4De5609",
            accountDepositAddress3: "0xcC46564Eb2063B60cd457da49d09dcA9544dfeAE",
            baseRewardPoolAddress: curveInfo.baseRewardPool.frax3crv,
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.frax.decimals), ethers.utils.parseUnits("0", 18)],
            pidPool: curveInfo.pid.frax3crv,
            nElementPool: curveInfo.nCoins.frax3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_frax",
            cvxSwapPath: "cvx_frax",
            amountToDepositVault: ethers.utils.parseEther("500"),
            feedAddress: oracleInfo.frax_usd,
            versionStrategy: "1.0"
        }
    }
    else if (name == "fraxusdc" ) {
        return {
            nameStrategy: "FraxUsdc",
            wantAddress: curveInfo.lp.fraxUsdc,
            tokenCompoundAddress: tokenInfo.usdc.address,
            curveSwapAddress: curveInfo.pool.fraxUsdc,
            tokenDepositAddress: tokenInfo.usdc.address,
            accountDepositAddress1: "0x1F376c00176b4Af9F0143067D58e135d05D65C81",
            accountDepositAddress2: "0x3B2A1234378745f53Cf8cC0Aa1f53786c8709B78",
            accountDepositAddress3: "0xeb26a7F7a356C0A96DA7157501eC372cBbe98f6D",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("1000", tokenInfo.usdc.decimals)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.fraxUsdc,
            pidPool: curveInfo.pid.fraxUsdc,
            nElementPool: curveInfo.nCoins.fraxUsdc,
            tokenCompoundPosition: 1,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_usdc",
            cvxSwapPath: "cvx_usdc",
            amountToDepositVault: ethers.utils.parseEther("500"),
            feedAddress: oracleInfo.usdc_usd,
            versionStrategy: "1.0"
        }
    }
    else if (name == "ibeurseur" ) {
        return {
            nameStrategy: "ibEurSEur",
            wantAddress: curveInfo.lp.ibEurSEur,
            tokenCompoundAddress: tokenInfo.ibEur.address,
            curveSwapAddress: curveInfo.pool.ibEurSEur,
            tokenDepositAddress: tokenInfo.ibEur.address,
            accountDepositAddress1: "0x07b01E611D9f51d08e4d6D08249413AFde2BcFd8",
            accountDepositAddress2: "0xA049801Ae55847eEb67DB8E1D7F9b6747d307e4E",
            accountDepositAddress3: "0x2B774AE83B165BFc48f91004c4AE146189d249aa",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.ibEur.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.ibEurSEur,
            pidPool: curveInfo.pid.ibEurSEur,
            nElementPool: curveInfo.nCoins.ibEurSEur,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_ibEur",
            cvxSwapPath: "cvx_ibEur",
            amountToDepositVault: ethers.utils.parseEther("500"),
            feedAddress: oracleInfo.ibEur_usd,
            versionStrategy: "1.0"
        }
    }
    else if (name == "mim3crv" ) {
        return {
            nameStrategy: "Mim3Crv",
            wantAddress: curveInfo.lp.mim3crv,
            tokenCompoundAddress: tokenInfo.mim.address,
            curveSwapAddress: curveInfo.pool.mim3crv,
            tokenDepositAddress: tokenInfo.mim.address,
            accountDepositAddress1: "0xd7efcbb86efdd9e8de014dafa5944aae36e817e4",
            accountDepositAddress2: "0x2bbdca89491e6f0c0f49412d38d893aea394fd02",
            accountDepositAddress3: "0x25431341A5800759268a6aC1d3CD91C029D7d9CA",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.mim.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.mim3crv,
            pidPool: curveInfo.pid.mim3crv,
            nElementPool: curveInfo.nCoins.mim3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_mim",
            cvxSwapPath: "cvx_mim",
            amountToDepositVault: ethers.utils.parseEther("500"),
            feedAddress: oracleInfo.mim_usd,
            versionStrategy: "1.0"
        }
    }
    else if (name == "tusd3crv" ) {
        return {
            nameStrategy: "Tusd3Crv",
            wantAddress: curveInfo.lp.tusdc3crv,
            tokenCompoundAddress: tokenInfo.tusd.address,
            curveSwapAddress: curveInfo.pool.tusdc3crv,
            tokenDepositAddress: tokenInfo.tusd.address,
            accountDepositAddress1: "0x270cd0b43f6fE2512A32597C7A05FB01eE6ec8E1",
            accountDepositAddress2: "0x662353d1A53C88c85E546d7C4A72CE8fE1018e72",
            accountDepositAddress3: "0x5aC8D87924255A30FEC53793c1e976E501d44c78",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.tusd.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.tusdc3crv,
            pidPool: curveInfo.pid.tusdc3crv,
            nElementPool: curveInfo.nCoins.tusdc3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_tusd",
            cvxSwapPath: "cvx_tusd",
            amountToDepositVault: ethers.utils.parseEther("500"),
            feedAddress: oracleInfo.tusd_usd,
            versionStrategy: "1.0"
        }
    }
    else if (name == "usdd3crv" ) {
        return {
            nameStrategy: "Usdd3Crv",
            wantAddress: curveInfo.lp.usdd3crv,
            tokenCompoundAddress: tokenInfo.usdd.address,
            curveSwapAddress: curveInfo.pool.usdd3crv,
            tokenDepositAddress: tokenInfo.usdd.address,
            accountDepositAddress1: "0x611F97d450042418E7338CBDd19202711563DF01",
            accountDepositAddress2: "0xee5B5B923fFcE93A870B3104b7CA09c3db80047A",
            accountDepositAddress3: "0x44aa0930648738B39a21d66C82f69E45B2ce3B47",
            baseRewardPoolAddress: curveInfo.baseRewardPool.usdd3crv,
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.mim.decimals), ethers.utils.parseUnits("0", 18)],
            pidPool: curveInfo.pid.usdd3crv,
            nElementPool: curveInfo.nCoins.usdd3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_usdd",
            cvxSwapPath: "cvx_usdd",
            amountToDepositVault: ethers.utils.parseEther("500"),
            feedAddress: oracleInfo.usdd_usd,
            versionStrategy: "1.0"
        }
    }
}

export const deployScompTask = {
    getConfig: async function (name: string): Promise<Contract> {
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
    deployVault: async function (controllerAddress: string, wantAddress: string, treasuryFee: string, feeDeposit: any): Promise<Contract>{
        return await deployVault(controllerAddress, wantAddress, treasuryFee, feeDeposit);
    },
    deployStrategy: async function (nameStrategy: string, governanceAddress: string, surplusConverterV2Address: string,
                                    controllerAddress: string, oracleRouterAddress: string, wantAddress: string, tokenCompoundAddress: string,
                                    tokenCompoundPosition: number, pidPool: number, feeGovernance: number, feeStrategist: number,
                                    feeWithdraw: number, curveSwapAddress: string, nElementPool: number ,
                                    timeLockControllerAddress: string, versionStrategy: string): Promise<Contract> {
        return await deployStrategy(nameStrategy, governanceAddress, surplusConverterV2Address, controllerAddress, oracleRouterAddress, wantAddress, tokenCompoundAddress,
                                    tokenCompoundPosition, pidPool, feeGovernance, feeStrategist, feeWithdraw, curveSwapAddress, nElementPool,
                                    timeLockControllerAddress, versionStrategy);
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
