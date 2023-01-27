import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const fs = require('fs');

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;
let strategist : SignerWithAddress;

// contract deploy
let sCompTokenContract : Contract;
let veScompContract : Contract;
let masterchefScomp : Contract;
let feeDistributionContract : Contract;
let surplusConverterV2Contract : Contract;
let sCompController : Contract;
let sCompTimelockController : Contract;

// constant address
let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
let uniswapV2Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
let sushiswapAddress = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";
let crvAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52"
let cvxAddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B"

// variable address

// fee config

// Voting escrow scomp config
let nameVe = "Voting Escrow Scomp"
let symbolVe = "veScomp"
let versionVe = "veScomp1.0.0";

// Masterchef config
let tokenPerBlock = 9;
let initialBlock : any;

// Fee distribution config
let startTimestampFeeDistribution : any;

// Timelock controller config
let minDelay = 86400


const provider = new ethers.providers.JsonRpcProvider("http://104.248.142.30:8545")

async function main(): Promise<void> {

    await run('compile');
    [deployer, strategist] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address)
    console.log("Strategist surplus converter address: ", strategist.address)
    console.log("----------------------------")
}

async function deploySCompToken(): Promise<void> {
    // deploy stableComp token
    let tokenScompFactory = await ethers.getContractFactory("StableCompToken")
    sCompTokenContract = await tokenScompFactory.deploy();
    await sCompTokenContract.deployed();

    console.log("SComp token deployed to: ", sCompTokenContract.address)
}

async function deployVeScomp(): Promise<void> {
    let factory = await ethers.getContractFactory("veScomp");
    veScompContract = await factory.deploy(
        sCompTokenContract.address,
        nameVe,
        symbolVe,
        versionVe
    );
    await veScompContract.deployed();

    console.log("Voting escrow sComp address: ", veScompContract.address);

    veScompContract = await ethers.getContractAt("veScomp", veScompContract.address, deployer);
}

async function deployMasterchef(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    initialBlock = blockNumber + 1800;

    let factoryMasterchef = await ethers.getContractFactory("MasterChefScomp");
    masterchefScomp = await factoryMasterchef.deploy(
        sCompTokenContract.address,
        veScompContract.address,
        tokenPerBlock,
        initialBlock
    );

    console.log("Masterchef contract deployed to address: ", masterchefScomp.address);

}

async function deployFeeDistribution(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    startTimestampFeeDistribution = block.timestamp;

    // todo change weth address with stable comp token in production

    let feeDistributionFactory = await ethers.getContractFactory("FeeDistribution");
    feeDistributionContract = await feeDistributionFactory.deploy(
        veScompContract.address,
        startTimestampFeeDistribution,
        wethAddress,
        deployer.address,
        deployer.address
    )

    console.log("Fee distribution contract deploy to: ", feeDistributionContract.address);

    feeDistributionContract = await ethers.getContractAt("IFeeDistributorFront", feeDistributionContract.address, deployer);

}

async function deploySurplusConverter(): Promise<void> {

    // todo change weth address with stable comp token in production

    let surplusConverterFactory = await ethers.getContractFactory("SurplusConverterUniV2Sushi");
    surplusConverterV2Contract = await surplusConverterFactory.deploy(
        wethAddress,
        feeDistributionContract.address,
        uniswapV2Address,
        sushiswapAddress,
        deployer.address,
        deployer.address,
        [deployer.address, strategist.address]
    )

    console.log("Surplus converter contract deploy to: ", surplusConverterV2Contract.address);

    await setSurplusConverterV2();

}

async function setSurplusConverterV2(): Promise<void> {
    // todo change weth address with scompToken

    let tx = await surplusConverterV2Contract.addToken(crvAddress, [crvAddress, wethAddress], 1);
    await tx.wait();
    tx = await surplusConverterV2Contract.addToken(cvxAddress, [cvxAddress, wethAddress], 1);
    await tx.wait();
    tx = await surplusConverterV2Contract.unpause();
    await tx.wait();
}

async function deployController(): Promise<void> {
    // deploy controller
    let factoryController = await ethers.getContractFactory("SCompController")
    sCompController = await factoryController.deploy(
        deployer.address,
        deployer.address,
        deployer.address,
    );
    await sCompController.deployed();

    console.log("Controller deployed to: ", sCompController.address)
}

async function deployTimeLockController(): Promise<void> {
    // deploy timeLockController
    let factoryTimeLock = await ethers.getContractFactory("SCompTimeLockController")
    sCompTimelockController = await factoryTimeLock.deploy(
        minDelay,
        [deployer.address],
        [deployer.address]
    );
    await sCompTimelockController.deployed();

    console.log("Timelock controller deployed to: ", sCompTimelockController.address)
}

async function writeAddressInJson(): Promise<void> {

    let path = "./address/address_scaling_node/mainAddress.json"
    let pathRename = "./address/address_scaling_node/mainAddress_"+Date.now()+".json"

    await fs.rename(path, pathRename, function(err:any) {
        console.log("error rename file address")
    });

    let address = {
        sCompTokenContract: {
            address: sCompTokenContract.address,
            args: {},
        },
        veScompContract: {
            address: veScompContract.address,
            args: {
                sCompTokenAddress: sCompTokenContract.address,
                nameVe: nameVe,
                symbolVe: symbolVe,
                versionVe: versionVe,
            },
        },
        masterchefScomp: {
            address: masterchefScomp.address,
            args: {
                sCompTokenAddress: sCompTokenContract.address,
                veScompAddress: veScompContract.address,
                tokenPerBlock: tokenPerBlock,
                initialBlock: initialBlock
            }
        },
        feeDistributionContract: {
            address: feeDistributionContract.address,
            args: {
                veScompAddress: veScompContract.address,
                startTimestamp: startTimestampFeeDistribution,
                tokenAddress: wethAddress,
                admin: deployer.address,
                emergencyReturn: deployer.address
            }
        },
        surplusConverterV2Contract: {
            address: surplusConverterV2Contract.address,
            args: {
                rewardToken: wethAddress,
                feeDistributor: feeDistributionContract.address,
                uniswapV2Address: uniswapV2Address,
                sushiswapAddress: sushiswapAddress,
                whitelisted: deployer.address,
                governor: deployer.address,
                guardians: [deployer.address, strategist.address]
            }
        },
        sCompController: {
            address: sCompController.address,
            args: {
                governance: deployer.address,
                strategist: deployer.address,
                rewards: deployer.address,
            }
        },
        sCompTimelockController: {
            address: sCompTimelockController.address,
            args: {
                minDelay: minDelay,
                proposer: [deployer.address],
                executors: [deployer.address],
            }
        },
    };

    let data = JSON.stringify(address);
    fs.writeFileSync(path, data);
}

async function verify(): Promise<void> {

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost" &&
        hardhat.network.name !== "scaling_node" &&
        hardhat.network.name !== "local_node"
    ) {

        // Wait 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));

        await run("verify:verify", {
            address: sCompTokenContract.address,
            constructorArguments: [],
        });

        await run("verify:verify", {
            address: veScompContract.address,
            constructorArguments: [
                sCompTokenContract.address,
                nameVe,
                symbolVe,
                versionVe
            ],
        });

        await run("verify:verify", {
            address: masterchefScomp.address,
            constructorArguments: [
                sCompTokenContract.address,
                veScompContract.address,
                tokenPerBlock,
                initialBlock
            ],
        });

        await run("verify:verify", {
            address: feeDistributionContract.address,
            constructorArguments: [
                veScompContract.address,
                startTimestampFeeDistribution,
                wethAddress,
                deployer.address,
                deployer.address
            ],
        });

        await run("verify:verify", {
            address: surplusConverterV2Contract.address,
            constructorArguments: [
                wethAddress,
                feeDistributionContract.address,
                uniswapV2Address,
                sushiswapAddress,
                deployer.address,
                deployer.address,
                [deployer.address, strategist.address]
            ],
        });

        await run("verify:verify", {
            address: sCompController.address,
            constructorArguments: [
                deployer.address,
                deployer.address,
                deployer.address
            ],
        });

        await run("verify:verify", {
            address: sCompTimelockController.address,
            constructorArguments: [
                minDelay,
                [deployer.address],
                [deployer.address]
            ],
        });
    }
}


main()
    .then(async () => {
        let initialBalance:any = await deployer.getBalance();
        console.log("Initial balance: ", ethers.utils.formatEther(initialBalance))

        await deploySCompToken();
        await deployVeScomp();
        await deployMasterchef();
        await deployFeeDistribution();
        await deploySurplusConverter();
        await deployController();
        await deployTimeLockController();
        await writeAddressInJson();
        await verify();

        let finalBalance:any = await deployer.getBalance();
        let totalFee = initialBalance.sub(finalBalance);

        console.log("Deploy cost: ", ethers.utils.formatEther(totalFee));
        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

