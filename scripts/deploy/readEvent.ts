import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";
import {start} from "repl";

const { run, ethers, upgrades } = hardhat;

let deployer : SignerWithAddress;

const provider = new ethers.providers.JsonRpcProvider("http://104.248.142.30:8545")

let vaultAddress = "0x6212cb549De37c25071cF506aB7E115D140D9e42";
let vaultContract : Contract;


async function main(): Promise<void> {

    await run('compile');
    [deployer] = await ethers.getSigners();
    console.log("Deployer addresss: ", deployer.address)
}


async function readEvent(): Promise<void> {


    let abi = [
        "event Deposit(address indexed _receiver, uint _amount, uint256 _timestamp)",
        "event Withdraw(address indexed _receiver, uint _amount, uint256 _timestamp)"
    ];

    vaultContract = new Contract(vaultAddress, abi, ethers.provider);

    let filterDeposit = await vaultContract.filters.Deposit("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");

    let listDeposit = await vaultContract.queryFilter(filterDeposit)

    if (listDeposit.length > 0 ) {

        let args:any = listDeposit[0].args;
        let receiver = args[0];
        let amount = args[1];
        let timestamp = args[2];

        console.log("Account ", receiver, " deposit of ", amount, " in timestamp: ", timestamp)

    }
    let filterWithdraw = await vaultContract.filters.Withdraw("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");

    let listWithdraw = await vaultContract.queryFilter(filterWithdraw)

    if (listWithdraw.length > 0 ) {

        let args: any = listWithdraw[0].args;
        let receiver = args[0];
        let amount = args[1];
        let timestamp = args[2];

        console.log("Account ", receiver, " withdraw of ", amount, " in timestamp: ", timestamp)

    }
}

  main()
    .then(async () => {

        await readEvent();
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

