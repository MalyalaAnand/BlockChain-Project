require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const networks = {};
// Optional: public test network. Set SEPOLIA_RPC_URL and PRIVATE_KEY in .env
if (process.env.SEPOLIA_RPC_URL && process.env.PRIVATE_KEY) {
  networks.sepolia = { url: process.env.SEPOLIA_RPC_URL, accounts: [process.env.PRIVATE_KEY] };
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks,
};
