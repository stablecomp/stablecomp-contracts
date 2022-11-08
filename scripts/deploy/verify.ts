import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

let nameVe = "Voting Escrow Scomp"
let symbolVe = "veScomp"
let versionVe = "veScomp1.0.0";

async function main(): Promise<void> {
    await run('compile');

}

async function verify(): Promise<void> {

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
/*
        await run("verify:verify", {
            address: "0x0D1eFa4CcdF35fEf9248d66e87869b2E28Dcfd38",
            constructorArguments: [
                "0xBf9A332869D2cd4dFd0127a4eE7C053Cee9AA72f",
                nameVe,
                symbolVe,
                versionVe
            ],
        });*/

        await run("verify:verify", {
            address: "0x06940026517BAe3c0321E390B8f83876aa4d59ee",
            constructorArguments: [
                "0xBf9A332869D2cd4dFd0127a4eE7C053Cee9AA72f",
                "0x0D1eFa4CcdF35fEf9248d66e87869b2E28Dcfd38",
                9,
                24385794
            ],
        });
    }
}

  main()
    .then(async () => {
      await verify();
      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

