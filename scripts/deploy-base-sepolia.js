/* eslint-disable no-console */
import dotenv from "dotenv";
import hre from "hardhat";
dotenv.config();

async function main() {
  const networkName = hre.network.name;
  if (networkName !== "baseSepolia") {
    console.warn(`Warning: You are deploying to '${networkName}'. Pass --network baseSepolia to use Base Sepolia.`);
  }

  const {
    TOKEN_NAME = "TestToken",
    TOKEN_SYMBOL = "TT",
    TOKEN_SUPPLY = "1000000000000000000000000", // 1,000,000 TT with 18 decimals
    CLANKER_WALLET = "0x0000000000000000000000000000000000000001",
    TEAM_WALLET = "0x0000000000000000000000000000000000000002",
    DEPLOYER_WALLET = "0x0000000000000000000000000000000000000003",
  } = process.env;

  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is required in .env to deploy");
  }

  console.log("Deploying FeeERC20 to:", networkName);
  console.log("Params:", { TOKEN_NAME, TOKEN_SYMBOL, TOKEN_SUPPLY, CLANKER_WALLET, TEAM_WALLET, DEPLOYER_WALLET });

  const FeeERC20 = await hre.ethers.getContractFactory("FeeERC20");
  const contract = await FeeERC20.deploy(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    TOKEN_SUPPLY,
    CLANKER_WALLET,
    TEAM_WALLET,
    DEPLOYER_WALLET
  );
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const tx = contract.deploymentTransaction ? contract.deploymentTransaction() : undefined;
  const txHash = tx && tx.hash ? tx.hash : undefined;
  console.log("FeeERC20 deployed at:", address);
  if (txHash) console.log("Deployment tx hash:", txHash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


