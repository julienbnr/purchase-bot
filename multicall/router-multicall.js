"use strict";

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

//const multiCallContract = new ethers.Contract('0x41263cba59eb80dc200f3e2544eda4ed6a90e76c', multiCallAbi, account);
//const multiCallContract = new c.Contract('0x41263cba59eb80dc200f3e2544eda4ed6a90e76c', multiCallAbi, provider);
const multiCallContract = new ethers.Contract('0x41263cba59eb80dc200f3e2544eda4ed6a90e76c', multiCallAbi, account);

const call = require('./call');
const ROUTER_ABI = require('../abi.json');
const ERC20ABI = require('../erc20ABI.json');


const buildCall = async () => {
  const swapExactTokensForToken = ROUTER_ABI.filter(item => item.name === 'swapExactTokensForTokens')[0];
  const getAmountOut = ROUTER_ABI.filter(item => item.name === 'getAmountsOut')[0];
  const approval = ERC20ABI.filter(item => item.name === 'approve')[0];

  const amountOut = {
    contract: {
      address: '0x10ED43C718714eb63d5aA57B78B54704E256024E'
    },
    name: 'getAmountsOut',
    inputs: getAmountOut.inputs,
    outputs: getAmountOut.outputs,
    params: [
      ethers.utils.parseUnits(String(1)),
      [
        '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
        '0xe9e7cea3dedca5984780bafc599bd69add087d56'
      ]
    ]
  };



  // Swap BUSD->USDT
  const swap = {
    contract: {
      address: '0x10ED43C718714eb63d5aA57B78B54704E256024E'
    },
    name: 'swapExactTokensForTokens',
    inputs: swapExactTokensForToken.inputs,
    outputs: swapExactTokensForToken.outputs,
    params: [
      '1',
      '0',
      [
        '0xe9e7cea3dedca5984780bafc599bd69add087d56',
        '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
      ],
      '0x222154384fE0d873d1beD81f9D59DB48309cD010',
      1624999999
    ]
  };
  /*const paramData = [
    ethers.utils.parseUnits(String(1)),
      '0',
      [
          '0xe9e7cea3dedca5984780bafc599bd69add087d56',
          '0x55d398326f99059ff775485246999027b3197955'
      ],
      '0x222154384fE0d873d1beD81f9D59DB48309cD010',
      Math.floor(Date.now() / 1000) + 2000
  ];
  const data = [{
    contract: {
      address: '0x10ED43C718714eb63d5aA57B78B54704E256024E'
    },
    name: 'swapExactTokensForTokens',
    inputs: inputs,
    outputs: swapExactTokensForToken.outputs,
    params: paramData
  }];*/

  const approve = {
    contract: {
      address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
    },
    name: 'approve',
    inputs: approval.inputs,
    outputs: approval.outputs,
    params: [
      '0x222154384fe0d873d1bed81f9d59db48309cd010',
      '0'
    ]
  };
  const data = [
      swap
  ];

  /*const totalSupply = ERC20ABI.filter(item => item.name === 'totalSupply')[0];
  const data = [{
    contract: {
      address: '0xe9e7cea3dedca5984780bafc599bd69add087d56'
    },
    name: 'totalSupply',
    inputs: totalSupply.inputs,
    outputs: totalSupply.outputs,
    params: []
  }]*/

  const result = await call.multiCall(multiCallContract, data, await provider.getBlockNumber());

  return;
};

buildCall();
