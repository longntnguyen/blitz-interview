require('dotenv').config();
import Web3 from 'web3';
import { AbiItem, StateMutabilityType } from 'web3-utils';
import {createObjectCsvWriter} from 'csv-writer';


const abiConfig = require("./config/abi.json")
const wallets = require("./config/wallets.json") as string[]

// Create a new web3 instance
const web3 = new Web3(new Web3.providers.HttpProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`));

type TBalance = { [wallet: string]: { [symbol: string]: string } } 

const tokens = [
    {
      name: 'USDT',
      symbol: 'USDT',
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    },
    {
      name: 'BNB',
      symbol: 'BNB',
      address: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
    },
    {
      name: 'USDC',
      symbol: 'USDC',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
    {
      name: 'MATIC',
      symbol: 'MATIC',
      address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
    },
];

// Function to query ERC20 token balances for all wallets
async function getTokenBalances(tokenAddress: string, walletAddresses: string[]): Promise<{ [wallet: string]: string }> {
  const contract = new web3.eth.Contract(abiConfig as AbiItem[], tokenAddress);
  const balancePromises = walletAddresses.map((walletAddress) =>
    contract.methods.balanceOf(walletAddress).call()
  );
  const balances = await Promise.all(balancePromises);

  const walletBalances: { [wallet: string]: string } = {};
  for (let i = 0; i < walletAddresses.length; i++) {
    walletBalances[walletAddresses[i]] = balances[i];
  }

  return walletBalances;
}

// Function to query ETH balances for all wallets
async function getEthBalances(walletAddresses: string[]): Promise<{ [wallet: string]: string }> {
  const balancePromises = walletAddresses.map((walletAddress) =>
    web3.eth.getBalance(walletAddress)
  );
  const balances = await Promise.all(balancePromises);

  const walletBalances: { [wallet: string]: string } = {};
  for (let i = 0; i < walletAddresses.length; i++) {
    walletBalances[walletAddresses[i]] = balances[i];
  }

  return walletBalances;
}

// Main function to calculate total balances
async function calculateTotalBalances() {
  const ethBalancesPromise = getEthBalances(wallets);
  const tokenBalancesPromises = tokens.map((token) => getTokenBalances(token.address, wallets));

  const [ethBalances, ...tokenBalances] = await Promise.all([
    ethBalancesPromise,
    ...tokenBalancesPromises,
  ]);

  const totalBalances: TBalance = {};

  for (const walletAddress of wallets) {
    totalBalances[walletAddress] = {
      ETH: web3.utils.fromWei(ethBalances[walletAddress], 'ether'),
    };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      totalBalances[walletAddress][token.symbol] = web3.utils.fromWei(
        tokenBalances[i][walletAddress],
        'ether'
      );
    }
  }

  return totalBalances;
}

// Function to save data into a CSV file
function saveDataToCsv(data: { [wallet: string]: { [symbol: string]: string } }) {
  const csvWriter = createObjectCsvWriter({
    path: 'balances.csv',
    header: [
      { id: 'wallet', title: 'Wallet' },
      ...tokens.map((token) => ({ id: token.symbol, title: token.name })),
      { id: 'ETH', title: 'ETH' },
    ],
  });

  const csvData = wallets.map((walletAddress) => ({
    wallet: walletAddress,
    ...data[walletAddress],
  }));

  csvWriter.writeRecords(csvData).then(() => {
    console.log('CSV file has been saved.');
  });
}

// Function to print out total balances
async function printTotalBalances(totalBalances: TBalance) {
  Object.entries(totalBalances).forEach(([key, value])=>{
    console.log(`Wallet: ${key}`);
    Object.entries(value).forEach(([tokenName, balance])=>{
      console.log('Token:', tokenName);
      console.log('Balance:', balance);

    })
    console.log('-----------------------------------');
  })
}

const printBalanaces = ()=> calculateTotalBalances()
  .then((totalBalances) => printTotalBalances(totalBalances))
  .catch(console.error);

const exportBalanaces = ()=> calculateTotalBalances()
  .then((totalBalances) => saveDataToCsv(totalBalances))
  .catch(console.error);

export {printBalanaces, exportBalanaces}