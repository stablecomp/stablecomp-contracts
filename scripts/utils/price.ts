import assert from 'assert';
import {BigNumber} from "ethers";


async function getFeeTx(tx: any, txCompleted: any) {
	let gasPrice = tx.gasPrice;
	let gasUsed = txCompleted.gasUsed;
	let feeTx = gasUsed * gasPrice;
	return BigNumber.from(feeTx.toString());
}

export const price = {
	getFeeTx: async function (tx: any, txCompleted: any) {
		return await getFeeTx(tx, txCompleted);
	},
};

export default price;
