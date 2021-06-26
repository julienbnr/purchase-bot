"use strict";
const ethereumMultiCall = require('ethereum-multicall');

const c = require('@ethersproject/contracts');


const env = require("../env.json");
Object.assign(process.env, env);

const ethers = require("ethers");
const multiCallAbi = require('../json/multicallAbi.json');

const provider = new ethers.providers.WebSocketProvider(
    process.env.BSC_NODE_WSS
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
const account = wallet.connect(provider);

const multiCall = new ethereumMultiCall.Multicall({
  ethersProvider: provider,
  tryAggregate: true,
  multicallCustomContractAddress: '0x41263cba59eb80dc200f3e2544eda4ed6a90e76c'
});

const ROUTER_ABI = require('../abi.json');

const fee = {
  gasLimit: ethers.utils.hexlify(500000),
  gasPrice: ethers.utils.parseUnits("5", "gwei")
};

const swap = {
  reference: 'swapExactTokensForTokens',
  contractAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  abi: ROUTER_ABI,
  calls: [
    {
      reference: 'swapExactTokensForTokens',
      methodName: 'swapExactTokensForTokens',
      methodParameters: [
        ethers.utils.parseUnits(String(1)),
        '0',
        [
          '0xe9e7cea3dedca5984780bafc599bd69add087d56',
          '0x55d398326f99059ff775485246999027b3197955'
        ],
        '0x222154384fE0d873d1beD81f9D59DB48309cD010',
        Math.floor(Date.now() / 1000) + 2000
      ]
    }
  ],
  overrides: {
    fee
  }
};

const contractCallContext = [
  swap,
  swap
];

multiCall.call(contractCallContext)
  .then(res => {
    console.log(res);
  });
