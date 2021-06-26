const multiCallUtil = require('@1inch/multicall');
const Web3 = require('web3');

const env = require("../env.json");
Object.assign(process.env, env);

const ethers = require("ethers");
const multiCallAbi = require('../json/multicallAbi.json');
const erc20ABI = require('../erc20ABI.json');
const provider = new multiCallUtil.Web3ProviderConnector(new Web3('wss://bsc-ws-node.nariox.org:443'));


const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
//const account = wallet.connect(provider);

const multiCallContractAddress = '0x804708de7af615085203fa2b18eae59c5738e2a9';

const gasLimitService = new multiCallUtil.GasLimitService(provider, multiCallContractAddress);
const multiCallService = new multiCallUtil.MultiCallService(provider, multiCallContractAddress);

const routerAbi = require('../abi.json');


const multiCall = async () => {
  const gasLimit = await gasLimitService.calculateGasLimit();
  const balanceOfGasUsage = 5_000;

  console.log(gasLimit);
  const myAddress = '0x222154384fE0d873d1beD81f9D59DB48309cD010';
  const sReq = {
    to: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    data: provider.contractEncodeABI(
        erc20ABI,
        '0xe9e7cea3dedca5984780bafc599bd69add087d56',
        'balanceOf',
        [myAddress]
    )
  };

  const requests = [

   {
      to: '0x10ed43c718714eb63d5aa57b78b54704e256024e',
      data: provider.contractEncodeABI(
          routerAbi,
          '0x10ed43c718714eb63d5aa57b78b54704e256024e',
          'swapExactTokensForTokens',
          [
            ethers.utils.parseUnits(String(1)),
            '0',
            [
              '0xe9e7cea3dedca5984780bafc599bd69add087d56',
              '0x55d398326f99059ff775485246999027b3197955'
            ],
            '0x222154384fE0d873d1beD81f9D59DB48309cD010',
            1624790000
          ]
      ),
      gas: balanceOfGasUsage
    }
  ];

  const params = {
    maxChunkSize: 500,
    retriesLimit: 3,
    blockNumber: 'latest',
    gasBuffer: 100_000
  };

  const response = await multiCallService.callByGasLimit(
      requests,
      gasLimit,
      params
  );

  multiCallUtil.requestsToMulticallItems(
      [
        {
          to: '',
          data: response[0],
          gas: 100_000
        }
      ]
  );

  console.log(response);
};

multiCall();
