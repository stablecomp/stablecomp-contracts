import assert from "assert";

const PREFIX = "VM Exception while processing transaction: ";
const PREFIX2 = "VM Exception while processing transaction: ";
const PREFIX_WITHOUT_REASON = "Transaction reverted without a reason string";

async function tryCatch(promise: any, message: string) {
    try {
        await promise;
        throw null;
    }
    catch (error: any) {
        assert(error, "Expected an error but did not get one");
        assert(error.message.startsWith(PREFIX + message), "Expected an error starting with '" + PREFIX + message + "' but got '" + error.message + "' instead");
    }
};
async function tryCatch2(promise: any, message: string) {
    try {
        await promise;
        throw null;
    }
    catch (error: any) {
        assert(error, "Expected an error but did not get one");
        assert(error.message.startsWith(PREFIX2 + message), "Expected an error starting with '" + PREFIX + message + "' but got '" + error.message + "' instead");
    }
};

async function tryCatchWithoutReason(promise: any, message: string) {
    try {
        await promise;
        throw null;
    }
    catch (error: any) {
        assert(error, "Expected an error but did not get one");
    }
};

export const exception = {
    catchRevert: async function(promise: any) {
        await tryCatch(promise, "revert"             );
        },
    catchRevertWithoutReason            : async function(promise: any) {await tryCatchWithoutReason(promise, ""          );},
    catchOutOfGas                       : async function(promise: any) {await tryCatch(promise, "out of gas"         );},
    catchInvalidJump                    : async function(promise: any) {await tryCatch(promise, "invalid JUMP"       );},
    catchInvalidOpcode                  : async function(promise: any) {await tryCatch(promise, "invalid opcode"     );},
    catchStackOverflow                  : async function(promise: any) {await tryCatch(promise, "stack overflow"     );},
    catchStackUnderflow    : async function(promise: any) {await tryCatch(promise, "stack underflow"    );},
    catchStaticStateChange : async function(promise: any) {await tryCatch(promise, "static state change");},
};
