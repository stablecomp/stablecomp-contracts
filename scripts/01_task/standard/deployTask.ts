import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import fs from "fs";
const { run, ethers } = hardhat;

// DEPLOY FUNCTION
/**
 * Deploy struct for standard contract, verify and save address in local file
 * Custom with action mandatory after deploy, save address and log
 * @param abiOrName
 * @param params
 */
async function deployContract(abiOrName: string, params: any): Promise<Contract> {
    let factory = await ethers.getContractFactory(abiOrName);
    let contract = await factory.deploy(params);

    console.log("Contract deployed to address: ", contract.address);

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {

        // todo jsonDataCustom
        let jsonData = {
             nameContract: {
                address: contract.address,
                args: {},
            }
        }
        await writeAddressInJson("contract", "contractAddress", jsonData)

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

/**
 * Verify struct for standard contract
 * Custom with correct params
 * @param address
 * @param params1
 * @param params2
 */
async function verifyContract(address: string, params1: any, params2: any): Promise<void> {
    await run("verify:verify", {
        address: address,
        constructorArguments: [params1, params2],
    });
}

/**
 * Write address in local file
 * If folder doesn't exist will be created
 * If file already exist will be make a backup of file
 * @param folder
 * @param nameFile
 * @param jsonData
 */
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

export const deployTask = {
    writeAddressInJson: async function (folder: string, nameFile: string, jsonData: any): Promise<void>{
        return await writeAddressInJson(folder, nameFile, jsonData);
    },
    deployContract: async function (abiOrName: string, params: any): Promise<Contract>{
        return await deployContract(abiOrName, params);
    },
    verifyContract: async function (address: string, params1: any, params2: any): Promise<void>{
        return await verifyContract(address, params1, params2);
    },
};
