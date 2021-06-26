const sha3 = require('js-sha3');
const abiDecoder = require('@ethersproject/abi');

const encode = (name, inputs, params) => {
  const functionSignature = getFunctionSignature(name, inputs);
  const functionHash = sha3.keccak256(functionSignature);
  const functionData = functionHash.substring(0, 8);
  const argumentString = abiDecoder.defaultAbiCoder.encode(inputs, params);
  const argumentData = argumentString.substring(2);

  return `0x${functionData}${argumentData}`;
};

const decode = (outputs, data) => {
  return abiDecoder.defaultAbiCoder.decode(outputs, data);
};


const getFunctionSignature = (name, inputs) => {
  const types = [];
  for (const input of inputs) {
    if (input.type === 'tuple') {
      const tupleString = getFunctionSignature('', input.components);
      types.push(tupleString);
      continue;
    }
    if (input.type === 'tuple[]') {
      const tupleString = getFunctionSignature('', input.components);
      const arrayString = `${tupleString}[]`;
      types.push(arrayString);
      continue;
    }
    types.push(input.type);
  }
  const typeString = types.join(',');
  return `${name}(${typeString})`;
}

exports.encode = encode;
exports.decode = decode;
exports.getFunctionSignature = getFunctionSignature;
