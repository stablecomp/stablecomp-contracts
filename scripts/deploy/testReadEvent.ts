import hardhat, {network, web3} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";
import InputDataDecoder from 'ethereum-input-data-decoder';

const { run, ethers, upgrades } = hardhat;

const info = require('../../strategyInfo/infoPool/fraxUsdc.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;

let whaleWantAccount : SignerWithAddress;
let whaleWantAddress : any = "0x664d8f8f2417f52cbbf5bd82ba82eefc58a87f07";

// contract deploy
let sCompVault : Contract;
let sCompVaultFake : Contract;
let sCompController : Contract;
let sCompStrategy : Contract;
let wantContract: Contract;

// variable address
let wantAddress = info.wantAddress; // **name** // 18 decimals
let tokenLockAddress: any;
let tokenCompoundAddress = info.tokenCompoundAddress; // **name** // 18 decimals
let curveSwapAddress = info.curveSwapAddress; // pool **name pool** curve

// convex pool info
let nameStrategy = info.nameStrategy
let pidPool = info.pidPool;
let nElementPool = info.nElementPool;
let tokenCompoundPosition = info.tokenCompoundPosition;

// fee config
let feeGovernance = info.feeGovernance;
let feeStrategist = info.feeStrategist;
let feeWithdraw = info.feeWithdraw;

let tokenLock : Contract;
let veCrv : Contract;
let masterchefScomp : Contract;

let nameVe = "Voting Escrow Scomp"
let symbolVe = "veScomp"
let versionVe = "veScomp1.0.0";

let tokenPerBlock = 9;


// todo deploy converter and feeDistributor

async function main(): Promise<void> {

    await run('compile');
    [deployer] = await ethers.getSigners();
    console.log("Deployer addresss: ", deployer.address)
}

async function test(): Promise<void> {

    let tokenAddress = "0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7";

    let abi = [
        "event Transfer(address indexed from, address indexed to, uint val)"
    ];

    let contract = new Contract(tokenAddress, abi, ethers.provider);
    let response = await contract.filters.Transfer("vault", "account") //withdraw
    response = await contract.filters.Transfer("account", "vault") // deposit

    response = await contract.filters.Transfer("zapper", "account") // withdraw
    response = await contract.filters.Transfer("accout", "zapper") // deposit

    let listTransfer = await contract.queryFilter(response)
    console.log("Event transfer in contract: ", listTransfer.length);
    console.log("events")
    console.log(listTransfer[0])

    let args:any = listTransfer[0].args;
    let fromAddress = args[0];
    let toAddress = args[1];
    let amount = args[2];

    console.log("Transfer from: ", fromAddress, " to: ", toAddress, " amount: ", ethers.utils.formatEther(amount))
}

  main()
    .then(async () => {
        await test();

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

