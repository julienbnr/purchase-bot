const multiCallAbi = require('../json/multicallAbi.json');
const Abi = require('./abi.js');
const ethers = require("ethers");


/*class Call {
  contract: {
    address: string;
  };
  name: string
  inputs: any[]
  outputs: any[];
  params: any[];
}*/

const multiCall = async (multiCallContract, calls, block) => {
  console.log(calls);
  const callRequests = calls.map(call => {
    const callData = Abi.encode(call.name, call.inputs, call.params);
    return {
      target: call.contract.address,
      callData,
    };
  });

  const overrides = {
    gasLimit: ethers.utils.hexlify(500000),
    gasPrice: ethers.utils.parseUnits("5", "gwei")
  };

  console.log(callRequests);
  const response = await multiCallContract.aggregate(
      callRequests,
      overrides
  );


  const receipt = await response.wait();
  console.log('receipt');
  console.log(response);
  console.log(receipt);

  const callCount = calls.length;
  const callResult = [];
  for (let i = 0; i < callCount; i++) {
    const outputs = calls[i].outputs;
    const returnData = response.returnData[i];
    const params = Abi.decode(outputs, returnData);
    const result = outputs.length === 1
        ? params[0]
        : params;
    callResult.push(result);
  }
  return callResult;
}

exports.multiCall = multiCall;
