const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const F = await hre.ethers.getContractFactory("AgentReputation");
  const c = await F.deploy();
  await c.waitForDeployment();
  const address = await c.getAddress();
  console.log("AgentReputation deployed to:", address);

  const artifact = await hre.artifacts.readArtifact("AgentReputation");
  const out = JSON.stringify({ address, abi: artifact.abi }, null, 2);
  for (const target of ["frontend/src/contract.json", "backend/contract.json"]) {
    fs.writeFileSync(path.join(__dirname, "..", target), out);
    console.log("Wrote", target);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
