import {BigNumber} from "ethers";
import axios from 'axios';


async function getFeeTx(tx: any, txCompleted: any) {
	let gasPrice = tx.gasPrice;
	let gasUsed = txCompleted.gasUsed;
	let feeTx = gasUsed * gasPrice;
	return BigNumber.from(feeTx.toString());
}

async function getPriceCRV() {

	let price;
	await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=curve-dao-token&vs_currencies=usd").then(response => {
		price = response.data;
	})

	return price;


}

async function getPriceETH() {

	let price;
	await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd").then(response => {
		price = response.data;
	})

	return price;


}

export const price = {
	getFeeTx: async function (tx: any, txCompleted: any) {
		return await getFeeTx(tx, txCompleted);
	},
	getPriceCRV: async function () {
		return await getPriceCRV();
	},
	getPriceETH: async function () {
		return await getPriceETH();
	},
};

export default price;
