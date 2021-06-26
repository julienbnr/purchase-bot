const providers = require('@0xsequence/multicall');
const ethers = require('ethers');

const provider = new providers.MulticallProvider(new ethersProviders.JsonRpcProvider("https://cloudflare-eth.com/"))

const ERC20ABI = require('../erc20ABI.json');

const go = async () => {
  const abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function symbol() view returns (string)",
  ]

  const uni = new ethers.Contract("0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", abi, provider)
  const dai = new ethers.Contract("0x6B175474E89094C44Da98b954EedeAC495271d0F", abi, provider)

  const uniTotalSupplyPromise = uni.totalSupply()

  const [totalSupply, balance, daiSymbol, uniSymbol] = await Promise.all([
    dai.totalSupply(),
    dai.balanceOf("0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"),
    dai.symbol(),
    uni.symbol()
  ])

  const uniTotalSupply = await uniTotalSupplyPromise
};
