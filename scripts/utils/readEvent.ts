import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";
import {start} from "repl";
import price from "./price";
import {BigNumber} from "ethers";

const { run, ethers, upgrades } = hardhat;

let deployer : SignerWithAddress;

const provider = new ethers.providers.JsonRpcProvider("http://104.248.142.30:8545")

let vaultAddress = "0x937A459c8F282abA432f5D5e14bD801ff848A1E3";
let zapperAddress = "0x937A459c8F282abA432f5D5e14bD801ff848A1E3";
let vaultContract : Contract;
let zapperContract : Contract;

let accountAddress = "0xF4aE445c23e0DA77BF2bDD7934577BCe2b3f1C55";

async function main(): Promise<void> {

    await run('compile');
    [deployer] = await ethers.getSigners();
    console.log("Deployer addresss: ", deployer.address)
}



async function getContract(): Promise<void> {

    let abiVault = [
        "event Deposit(address indexed _receiver, uint _amount, uint256 _timestamp)",
        "event Withdraw(address indexed _receiver, uint _amount, uint256 _timestamp)",
        //"function getPricePerFullShare() public view returns (uint256)",
        "function balanceOf(address account) external view returns (uint256)"
    ];

    let vaultFactory = await ethers.getContractFactory("SCompVault")
    vaultContract = await vaultFactory.attach(vaultAddress);
    //vaultContract = new Contract(vaultAddress, abiVault, ethers.provider);

    let abiZapper = [
        "event NewOneClickIn(address indexed TokenIn, address indexed poolAddress, uint amountIn, uint lpAmount, address indexed user)",
        "event NewOneClickOut(address indexed TokenOut, address indexed poolAddress, uint amountOut, uint[] TokenOutAmount, address indexed user)"
    ];

    zapperContract = new Contract(zapperAddress, abiZapper, ethers.provider);

}

async function readBalanceShare(): Promise<void> {
    let balanceShare = await vaultContract.balanceOf(accountAddress);
    console.log("Balance share of account is: ", ethers.utils.formatEther(balanceShare))

    let pricePerFullShare = await vaultContract.getPricePerFullShare();
    console.log("Price per full share: ", ethers.utils.formatUnits(pricePerFullShare, 0))
}

async function readEventVault(): Promise<void> {

    let filterDeposit = await vaultContract.filters.Deposit(accountAddress);

    let listDeposit = await vaultContract.queryFilter(filterDeposit)

    let totalAmountDeposit = BigNumber.from(0);

    if (listDeposit.length > 0 ) {

        for (let i = 0; i < listDeposit.length; i++) {

            let args:any = listDeposit[i].args;
            let receiver = args[0];
            let amount = args[1];
            let timestamp = args[2];

            //console.log("Account ", receiver, " deposit of ", amount, " in timestamp: ", timestamp)

            totalAmountDeposit = totalAmountDeposit.add(amount) ;

        }
    }

    console.log("Total deposit is: ", ethers.utils.formatEther(totalAmountDeposit))

    let filterWithdraw = await vaultContract.filters.Withdraw(accountAddress);

    let listWithdraw = await vaultContract.queryFilter(filterWithdraw)

    let totalAmountWithdraw = BigNumber.from(0);
    if (listWithdraw.length > 0 ) {

        for (let i = 0; i< listWithdraw.length; i++) {

            let args: any = listWithdraw[i].args;
            let receiver = args[0];
            let amount = args[1];
            let timestamp = args[2];

            //console.log("Account ", receiver, " withdraw of ", amount, " in timestamp: ", timestamp)

            totalAmountWithdraw = totalAmountWithdraw.add(amount);

        }
    }

    console.log("Total withdraw is: ", ethers.utils.formatEther(totalAmountWithdraw))

    let difference = totalAmountDeposit.sub(totalAmountWithdraw);

    console.log("Difference is: ", ethers.utils.formatEther(difference))

}

async function readEventZapper(): Promise<void> {

    let filterOneClickIn = await zapperContract.filters.NewOneClickIn(null, null, null, null, accountAddress);

    let listNewOneClickIn = await zapperContract.queryFilter(filterOneClickIn)

    let totalDepositZapper = BigNumber.from(0);
    console.log("listNewOneClickIn.length")
    console.log(listNewOneClickIn.length)
    if (listNewOneClickIn.length > 0 ) {

        for (let i = 0; i < listNewOneClickIn.length; i++) {

            let args: any = listNewOneClickIn[i].args;

            let amountLp = args[3];
            totalDepositZapper = totalDepositZapper.add(amountLp);
        }
    }

    console.log("Total deposit zapper is: ", ethers.utils.formatEther(totalDepositZapper))


    let filterOneClickOut = await zapperContract.filters.NewOneClickOut(null, null, null, null, accountAddress);

    let listNewOneClickOut = await zapperContract.queryFilter(filterOneClickOut)

    let totalWithdrawZapper = BigNumber.from(0);
    if (listNewOneClickOut.length > 0 ) {

        for (let i = 0; i < listNewOneClickOut.length; i++) {

            let args: any = listNewOneClickOut[i].args;

            let amountLp = args[3];
            console.log("amountLp")
            console.log(ethers.utils.formatEther(amountLp[0]))
            totalWithdrawZapper = totalWithdrawZapper.add(amountLp[0]);

        }
    }

    console.log("Total withdraw zapper is: ", ethers.utils.formatEther(totalWithdrawZapper))

}

  main()
    .then(async () => {
        await getContract();
        await readBalanceShare();
        await readEventVault();
        await readEventZapper();
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

