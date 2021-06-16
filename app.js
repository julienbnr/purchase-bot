"use strict";
const env = require("./env.json");
Object.assign(process.env, env);

const ethers = require("ethers");
const retry = require("async-retry");
const tokens = require("./tradeConfiguration.js");

const pcsAbi = new ethers.utils.Interface(require("./abi.json"));
const EXPECTED_PONG_BACK = 30000;
const KEEP_ALIVE_CHECK_INTERVAL = 15000;
const provider = new ethers.providers.WebSocketProvider(
  process.env.BSC_NODE_WSS
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
const account = wallet.connect(provider);
const router = new ethers.Contract(tokens.router, pcsAbi, account);

const moment = require('moment');

let buyTxSend = 0;

// The regex transaction to observe
const re1 = new RegExp("^0xf305d719"); // addLiquidityEth method id
const re2 = new RegExp("^0xe8e33700"); // addLiquidity method id

const displayAddLiquidityInfoFromTxHash = (txResponse, liquidityProvidedInETH) => {
  const now = new Date();
  console.log(`#######################################################`);
  console.log(`A new ${liquidityProvidedInETH ? 'addLiquidityETH' : 'addLiquidity'} transaction was found at ${now}!`);
  console.log(`Transaction hash is ${txResponse.hash}`);
  console.log(`Transaction Gas limit : ${txResponse.gasLimit}`);
  console.log(`Transaction Gas price : ${txResponse.gasPrice}`);
  console.log(`Add liquidity on token with address ${tokens.tokenOutput}`);
  console.log(`#######################################################`);
  console.log('\n');
};

const startConnection = () => {
  let pingTimeout = null;
  let keepAliveInterval = null;
  provider._websocket.on("open", () => {
    console.log(`Sniping on contract ${tokens.tokenOutput} has begun !`);
    keepAliveInterval = setInterval(() => {
      provider._websocket.ping();
      // Use `WebSocket#terminate()`, which immediately destroys the connection,
      // instead of `WebSocket#close()`, which waits for the close timer.
      // Delay should be equal to the interval at which your server
      // sends out pings plus a conservative assumption of the latency.
      pingTimeout = setTimeout(() => {
        provider._websocket.terminate();
      }, EXPECTED_PONG_BACK);
    }, KEEP_ALIVE_CHECK_INTERVAL);

    provider.on("pending", async (txHash) => {
      provider.getTransaction(txHash).then(async (tx) => {
        if (tx && tx.to) {
          if (tx.to === tokens.router) {
            const liqProvidedInETH = re1.test(tx.data);
            if ((liqProvidedInETH || re2.test(tx.data)) && buyTxSend < tokens.nbSwap) {
              const decodedInput = pcsAbi.parseTransaction({
                data: tx.data,
                value: tx.value,
              });

              console.log(`Add liquidity on token ${decodedInput.args[0]}`);
              if (tokens.tokenOutput.toLowerCase() === decodedInput.args[0].toLowerCase()) {
                displayAddLiquidityInfoFromTxHash(tx, liqProvidedInETH);
                for (let i = 0; i < tokens.nbSwap; i++) {
                  BuyToken(tx, liqProvidedInETH);
                  buyTxSend++;
                }
              }
            }
          }
        }
      });
    });
  });

  provider._websocket.on("close", () => {
    console.log("WebSocket Closed...Reconnecting...");
    clearInterval(keepAliveInterval);
    clearTimeout(pingTimeout);
    startConnection();
  });

  provider._websocket.on("error", () => {
    console.log("Error. Attemptiing to Reconnect...");
    clearInterval(keepAliveInterval);
    clearTimeout(pingTimeout);
    startConnection();
  });

  provider._websocket.on("pong", () => {
    clearInterval(pingTimeout);
  });
};

const BuyToken = async (txLP, liquidityProvidedInETH) => {
  const tx = await retry(
    async () => {
      let pair;
      let inputAmount;
      if (liquidityProvidedInETH) {
        inputAmount = tokens.inputAmountETH;
        pair = [
          tokens.ethToken,
          tokens.tokenOutput
        ];
      } else {
        inputAmount = tokens.inputAmountStable;
        pair = [
          tokens.stableToken,
          tokens.tokenOutput
        ];
      }
      return await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
          ethers.utils.parseUnits(String(inputAmount)),
          ethers.utils.parseUnits(String(0)),
          pair,
          process.env.RECIPIENT,
          moment().unix() + tokens.txSecondsDelay,
          {
            gasLimit: txLP.gasLimit,
            gasPrice: txLP.gasPrice
          }
        );
    },
    {
      retries: 5,
      minTimeout: 10000,
      maxTimeout: 15000,
      onRetry: (err, number) => {
        console.log("Buy Failed - Retrying", number);
        console.log("Error", err);
        if (number === 3) {
          console.log("Sniping has failed...");
          process.exit();
        }
      },
    }
  );
  console.log("Waiting for Transaction receipt...");
  const receipt = await tx.wait();
  console.log("Token Purchase Complete");
  console.log("Associated LP Event txHash: " + txLP.hash);
  console.log("Your txHash: " + receipt.transactionHash);
  process.exit();
};

startConnection();
