import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";
import {start} from "repl";

const { run, ethers } = hardhat;

const info = require('../../strategyInfo/infoPool/fraxUsdc.json');


async function main(): Promise<void> {


    let arg  = process.argv.slice(2)
    console.log("arg: ", arg)
}

  main()
    .then(async () => {

    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

