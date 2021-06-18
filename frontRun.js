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

let buyTxSend = 0;

// The regex transaction to observe
const re1 = new RegExp("^0xb6f9de95"); // swapExactETHForTokensSupportingFeeOnTransferTokens method id
const re2 = new RegExp("^0x38ed1739"); // swapExactTokensForTokens method id
const re3 = new RegExp("^0x5c11d795"); // swapExactTokensForTokensSupportingFeeOnTransferTokens method id

const displaySwapInfoFromTxHash = (txResponse) => {
  const now = new Date();
  console.log(`#######################################################`);
  console.log(`A new Swap transaction was found at ${now}`);
  console.log(`Transaction hash is ${txResponse.hash}`);
  console.log(`Transaction Gas limit : ${txResponse.gasLimit}`);
  console.log(`Transaction Gas price : ${txResponse.gasPrice}`);
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
          if (tx.to.toLowerCase() === tokens.router.toLowerCase()
              && tx.from.toLowerCase() === tokens.fromAddress.toLowerCase()) {
            if ((re1.test(tx.data) || re2.test(tx.data) || re3.test(tx.data)) && buyTxSend < tokens.nbSwap) {
              const decodedInput = pcsAbi.parseTransaction({
                data: tx.data,
                value: tx.value
              });

              const pathArg = decodedInput.args[2];
              const outTokenSwap = pathArg[pathArg.length - 1];
              
              if (tokens.tokenOutput.toLowerCase() === outTokenSwap.toLowerCase()) {
                displaySwapInfoFromTxHash(tx);
                for (let i = 0; i < tokens.nbSwap; i++) {
                  BuyToken(tx);
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

const BuyToken = async (txLP) => {
  const tx = await retry(
      async () => {
        const pair = [
          tokens.stableToken,
          tokens.tokenOutput
        ];
        return await router.swapExactTokensForTokens(
            ethers.utils.parseUnits(String(tokens.inputAmountStable)),
            ethers.utils.parseUnits(String(0)),
            pair,
            process.env.RECIPIENT,
            Math.floor(Date.now() / 1000) + tokens.txSecondsDelay,
            {
              gasLimit: txLP.gasLimit,
              gasPrice: txLP.gasPrice * 1.2
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
