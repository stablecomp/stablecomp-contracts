import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const universalRouterABI = require('../../abi/universalRouter.json');
const erc20ABI = require('../../abi/erc20.json');

const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');
const routerAddress = require('../../info/address_mainnet/routerAddress.json');

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;
let account2 : SignerWithAddress;

// contract deploy
let daiContract : Contract;
let universalRouter : Contract;
let crvContract : Contract;
let tetherUsdContract : Contract;

// token address

let daiWhaleAddress = "0xb527a981e1d415af696936b3174f2d7ac8d11369";
let whaleAccountDai : SignerWithAddress;

let crvWhaleAddress = "0x32D03DB62e464c9168e41028FFa6E9a05D8C6451";
let whaleAccountCrv : SignerWithAddress;

async function main(): Promise<void> {
    await run('compile');
    [deployer, account2] = await ethers.getSigners();

    await impersonateAccount();

    daiContract = new ethers.Contract(
        tokenInfo.dai.address,
        erc20ABI,
        ethers.provider
    )

    crvContract = new ethers.Contract(
        tokenInfo.crv.address,
        erc20ABI,
        ethers.provider
    )

    tetherUsdContract = new ethers.Contract(
        tokenInfo.tetherUsd.address,
        erc20ABI,
        ethers.provider
    )

    universalRouter = new ethers.Contract(
        routerAddress.universalRouter,
        universalRouterABI,
        ethers.provider
    )

}

async function transferFromWithRouter(): Promise<void> {
    let balanceCrvBefore = await daiContract.balanceOf(deployer.address);
    let txApprove = await daiContract.connect(deployer).approve("0x000000000022d473030f116ddee9f6b43ac78ba3", ethers.constants.MaxUint256)
    await txApprove.wait();

    let amountIn = ethers.utils.parseEther("1")

    let commands = ethers.utils.defaultAbiCoder.encode(["bytes1"], ["0x02"]);
    let commandsFormatted = commands.toString().substring(0,4)
    let inputs : any = [];
    inputs.push(ethers.utils.defaultAbiCoder.encode(["address"], [daiContract.address]));
    inputs.push(ethers.utils.defaultAbiCoder.encode(["address"], [account2.address]));
    inputs.push(ethers.utils.defaultAbiCoder.encode(["uint256"], [1]));

    let decoder = new ethers.utils.AbiCoder;

    let inputs2 : any = decoder.encode(["address", "address", "uint256"], [daiContract.address, account2.address, amountIn]);
    let inputs3 : any = ethers.utils.solidityPack(["address", "address", "uint256"], [daiContract.address, account2.address, amountIn]);

    console.log("inputs")
    console.log(inputs)
    console.log("commands")
    console.log(commandsFormatted)

    let txExecute = await universalRouter.connect(deployer).execute("0x05", [inputs2]);
    await txExecute.wait();
    let balanceCrvAfter = await daiContract.balanceOf(deployer.address);

    let diff = balanceCrvAfter.sub(balanceCrvBefore);

    console.log("Balance before swap: ", ethers.utils.formatEther(balanceCrvBefore),
        " \nbalance after swap: ", ethers.utils.formatEther(balanceCrvAfter),
        " \ndiff: ", ethers.utils.formatEther(diff))
}

async function transferWithRouter(): Promise<void> {
    let amountIn = ethers.utils.parseEther("1")
    let balanceCrvBefore = await daiContract.balanceOf(deployer.address);
    let txApprove = await daiContract.connect(deployer).approve(routerAddress.permit2, amountIn)
    await txApprove.wait();


    let commands = ethers.utils.defaultAbiCoder.encode(["bytes1"], ["0x05"]);
    let commandsFormatted = commands.toString().substring(0,4)
    let inputs : any = [];
    inputs.push(ethers.utils.defaultAbiCoder.encode(["address"], [daiContract.address]));
    inputs.push(ethers.utils.defaultAbiCoder.encode(["address"], [account2.address]));
    inputs.push(ethers.utils.defaultAbiCoder.encode(["uint256"], [1]));

    let decoder = new ethers.utils.AbiCoder;

    let inputs2 : any = decoder.encode(["address", "address", "uint256"], [daiContract.address, account2.address, amountIn]);
    let inputs3 : any = ethers.utils.solidityPack(["address", "address", "uint256"], [daiContract.address, account2.address, amountIn]);

    console.log("inputs")
    console.log(inputs)
    console.log("commands")
    console.log(commandsFormatted)

    let txExecute = await universalRouter.connect(deployer).execute("0x05", [inputs2]);
    await txExecute.wait();
    let balanceCrvAfter = await daiContract.balanceOf(deployer.address);

    let diff = balanceCrvAfter.sub(balanceCrvBefore);

    console.log("Balance before swap: ", ethers.utils.formatEther(balanceCrvBefore),
        " \nbalance after swap: ", ethers.utils.formatEther(balanceCrvAfter),
        " \ndiff: ", ethers.utils.formatEther(diff))
}

async function executeSwap(): Promise<void> {
    let amountIn = ethers.utils.parseEther("1")
    let balanceCrvBefore = await crvContract.balanceOf(deployer.address);
    let balanceTetherBefore = await tetherUsdContract.balanceOf(deployer.address);
    //let txApprove = await crvContract.connect(deployer).transfer(universalRouter.address, balanceCrvBefore)
    let txApprove = await crvContract.connect(deployer).approve(routerAddress.permit2, ethers.constants.MaxUint256)
    let txApprove2 = await tetherUsdContract.connect(deployer).approve(routerAddress.permit2, ethers.constants.MaxUint256)

    await txApprove.wait();
    await txApprove2.wait();

    let path = ethers.utils.solidityPack(["address", "uint24", "address"], [tokenInfo.crv.address, 10000, tokenInfo.tetherUsd.address])

    let decoder = new ethers.utils.AbiCoder;

    let inputs : any = decoder.encode(["address", "uint256", "uint256", "bytes", "bool"], [deployer.address, amountIn,0,path,true]);

    console.log("inputs")
    console.log(inputs)

    let txExecute = await universalRouter.connect(deployer).execute("0x00", [inputs]);
    await txExecute.wait();

    let balanceCrvAfter = await crvContract.balanceOf(deployer.address);
    let balanceTetherAfter = await tetherUsdContract.balanceOf(deployer.address);

    let diffCrv = balanceCrvAfter.sub(balanceCrvBefore);
    let diffTether = balanceTetherAfter.sub(balanceTetherBefore);

    console.log("Balance crv before swap: ", ethers.utils.formatEther(balanceCrvBefore),
        " \nbalance after swap: ", ethers.utils.formatEther(balanceCrvAfter),
        " \ndiff: ", ethers.utils.formatEther(diffCrv))

    console.log("Balance tether before swap: ", ethers.utils.formatUnits(balanceTetherBefore, tokenInfo.tetherUsd.decimals),
        " \nbalance after swap: ", ethers.utils.formatUnits(balanceTetherAfter,tokenInfo.tetherUsd.decimals),
        " \ndiff: ", ethers.utils.formatUnits(diffTether, tokenInfo.tetherUsd.decimals))
}

async function getContractUniversalRouter(): Promise<void> {

}

async function impersonateAccount(): Promise<void> {
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [daiWhaleAddress],
    });
    whaleAccountDai = await ethers.getSigner(daiWhaleAddress);

    await fundAccountETH(whaleAccountDai);

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [crvWhaleAddress],
    });
    whaleAccountCrv = await ethers.getSigner(crvWhaleAddress);

    await fundAccountETH(whaleAccountDai);
    await fundAccountETH(whaleAccountCrv);
}

async function fundAccountETH(account: SignerWithAddress): Promise<void> {
    await deployer.sendTransaction({
        from: deployer.address,
        to: account.address,
        value: ethers.utils.parseEther("1"), // Sends exactly 1.0 ether
    });
}

async function fundAccountCrv(account: SignerWithAddress): Promise<void> {

    let tx = await crvContract.connect(whaleAccountCrv).transfer(account.address, await crvContract.balanceOf(whaleAccountCrv.address));
    await tx.wait();
}

async function fundAccountDai(account: SignerWithAddress): Promise<void> {

    let tx = await daiContract.connect(whaleAccountDai).transfer(account.address, await daiContract.balanceOf(whaleAccountDai.address));
    await tx.wait();
}

main()
    .then(async () => {
        await getContractUniversalRouter();
        await fundAccountDai(deployer)
        await fundAccountCrv(deployer)
        //await transferWithRouter();
        //await transferFromWithRouter();
        await executeSwap();



        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

