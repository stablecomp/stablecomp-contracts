import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {utilsTask} from "../01_task/standard/utilsTask";
import {deployScompTask} from "../01_task/sCompTask";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;

let amountToFund = ethers.utils.parseEther("100")

let addressWhaleThreeEur = "0x98DebD798afbC0641B3AA0AdE7443BC8B619261E";
let addressWhaleBusd3crv = "0xA16dDC8BB94978Df95360f7d491A634EBcb4B796";
let addressWhaleDola3crv = "0xBB76eB024BE5D3A84f4CD82B6D3F5327f2778DfF";
let addressWhaleFrax3crv = "0x005fb56Fe0401a4017e6f046272dA922BBf8dF06";
let addressWhaleIbEurSEur = "0xF49B3852419160376E19053785A3f09cF47e0e15";
let addressWhaleMim3crv = "0xe896e539e557BC751860a7763C8dD589aF1698Ce";
let addressWhaleTusd3crv = "0xD34f3e85bB7C8020C7959B80a4B87a369D639dc0";
let addressWhaleFraxUsdc = "0x2983a7225ed34C73F97527F51a90CdDeD605CBf5";
let addressWhaleUsdd3Crv = "0xfe6Bc0f11013642C983e3691A272CB71374F774A";
let addressWhaleEuroC3crv = "0xbabe61887f1de2713c6f97e567623453d3C79f67";

let accountWhaleThreeEur: any;
let accountWhaleBusd3Crv: any;
let accountWhaleDola3Crv: any;
let accountWhaleFrax3Crv: any;
let accountWhaleIbEurSEur: any;
let accountWhaleMim3Crv: any;
let accountWhaleTusd3Crv: any;
let accountWhaleFraxUsdc: any;
let accountWhaleUsdd3Crv: any;
let accountWhaleEuroC3Crv: any;

let accountsToFund = [
    "0x228382B9Ca031071C12fC9264C28Af29D9d5836E","0xb928F09222e5dA8edbDf98570372FAEF56822F9D",
    "0x3054f2e2Aa021B7Ce60f5775d398207Cb0d1ff04","0x7f899aF73f9bC15E0c9Ab93636701AB4a7ceE07e",
    "0x8c28c750E8a4902fc82b076016158cE2F8674ceF","0xFf8671E3cD2573659B030427B1F9a66C2Ba38129",
    "0xb3ACC5456797e3c4788C2c01CFca0D96C6c8A708","0xc3B614e4792e45B840e2A7c63fB004612CCB49d1",
    "0xd306916c038C2894255F9402B560c3b2Aa886BFC","0x5115525d1066d29C5066f3971A0E1F017a133b39",
    "0x0Ba2734B4c3f70865c82424eE001a2cD20d6A48c","0xc48F21FB0281DE13B5d5CB33EEE581f4dB8c1e34"]

async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
    console.log("Account 1 address: ", account1.address, " with balance: ", ethers.utils.formatEther(await account1.getBalance()))
}

main()
    .then(async () => {
        accountWhaleThreeEur = await utilsTask.impersonateAccountExternalNode(addressWhaleThreeEur, "http://104.248.142.30:8545")
        accountWhaleBusd3Crv = await utilsTask.impersonateAccountExternalNode(addressWhaleBusd3crv, "http://104.248.142.30:8545")
        accountWhaleDola3Crv = await utilsTask.impersonateAccountExternalNode(addressWhaleDola3crv, "http://104.248.142.30:8545")
        accountWhaleFrax3Crv = await utilsTask.impersonateAccountExternalNode(addressWhaleFrax3crv, "http://104.248.142.30:8545")
        accountWhaleIbEurSEur = await utilsTask.impersonateAccountExternalNode(addressWhaleIbEurSEur, "http://104.248.142.30:8545")
        accountWhaleMim3Crv = await utilsTask.impersonateAccountExternalNode(addressWhaleMim3crv, "http://104.248.142.30:8545")
        accountWhaleTusd3Crv = await utilsTask.impersonateAccountExternalNode(addressWhaleTusd3crv, "http://104.248.142.30:8545")
        accountWhaleFraxUsdc = await utilsTask.impersonateAccountExternalNode(addressWhaleFraxUsdc, "http://104.248.142.30:8545")
        accountWhaleUsdd3Crv = await utilsTask.impersonateAccountExternalNode(addressWhaleUsdd3Crv, "http://104.248.142.30:8545")
        //accountWhaleEuroC3Crv = await utilsTask.impersonateAccountExternalNode(addressWhaleEuroC3crv, "http://104.248.142.30:8545")

        let config3crv = await deployScompTask.getConfig("3eur")
        let configBusd3crv = await deployScompTask.getConfig("busd3crv")
        let configDola3crv = await deployScompTask.getConfig("dola3crv")
        let configFrax3Crv = await deployScompTask.getConfig("frax3crv")
        let configIbEurSEur = await deployScompTask.getConfig("ibeurseur")
        let configMim3Crv = await deployScompTask.getConfig("mim3crv")
        let configTusd3Crv = await deployScompTask.getConfig("tusd3crv")
        let configFraxUsdc = await deployScompTask.getConfig("fraxusdc")
        let configUsdd3Crv = await deployScompTask.getConfig("usdd3crv")
        let configEuroC3Crv = await deployScompTask.getConfig("euroc3crv")

        /*for (let i = 0; i < accountsToFund.length; i++) {
            console.log(" --- Fund eth whale: ", accountsToFund[i], " --- ")
            await utilsTask.fundAccountETH(accountsToFund[i], ethers.utils.parseEther("0.5"))
        }*/

        for (let i = 0; i < accountsToFund.length; i++) {
            console.log(" --- Fund account: ", accountsToFund[i], " --- ")

            await utilsTask.fundAccountToken(config3crv.wantAddress, accountWhaleThreeEur, accountsToFund[i], amountToFund)
            console.log("ThreeEur sent")
            await utilsTask.fundAccountToken(configBusd3crv.wantAddress, accountWhaleBusd3Crv, accountsToFund[i], amountToFund)
            console.log("Busd3crv sent")
            await utilsTask.fundAccountToken(configDola3crv.wantAddress, accountWhaleDola3Crv, accountsToFund[i], amountToFund)
            console.log("Dola3Crv sent")
            await utilsTask.fundAccountToken(configFrax3Crv.wantAddress, accountWhaleFrax3Crv, accountsToFund[i], amountToFund)
            console.log("Frax3Crv sent")
            await utilsTask.fundAccountToken(configIbEurSEur.wantAddress, accountWhaleIbEurSEur, accountsToFund[i], amountToFund)
            console.log("IbEurSEur sent")
            await utilsTask.fundAccountToken(configMim3Crv.wantAddress, accountWhaleMim3Crv, accountsToFund[i], amountToFund)
            console.log("Mim3Crv sent")
            await utilsTask.fundAccountToken(configTusd3Crv.wantAddress, accountWhaleTusd3Crv, accountsToFund[i], amountToFund)
            console.log("Tusd3Crv sent")
            await utilsTask.fundAccountToken(configFraxUsdc.wantAddress, accountWhaleFraxUsdc, accountsToFund[i], amountToFund)
            console.log("FraxUsdc sent")
            await utilsTask.fundAccountToken(configUsdd3Crv.wantAddress, accountWhaleUsdd3Crv, accountsToFund[i], amountToFund)
            console.log("Usdd3Crv sent")
            //await utilsTask.fundAccountToken(configEuroC3Crv.wantAddress, accountWhaleEuroC3Crv, accountsToFund[i], amountToFund)
            //console.log("EuroC3Crv sent")
        }

    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

