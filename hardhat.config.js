require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    base: {
      url: "https://mainnet.base.org",
      chainId: 8453,
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      chainId: 84532,
    }
  }
};
