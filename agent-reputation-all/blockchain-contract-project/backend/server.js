// Node.js + Express backend: handles AI task requests and exposes read-only chain data.
const express = require("express");
const cors = require("cors");
const { JsonRpcProvider, Contract } = require("ethers");
const deployed = require("./contract.json");

const PORT = process.env.PORT || 4000;
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

const app = express();
app.use(cors());
app.use(express.json());

const provider = new JsonRpcProvider(RPC_URL);
const contract = new Contract(deployed.address, deployed.abi, provider);

const STATUS = ["Created", "Completed", "Rated"];

app.get("/api/health", (_req, res) => res.json({ ok: true, contract: deployed.address }));

app.get("/api/agents", async (_req, res) => {
  try {
    const n = Number(await contract.agentCount());
    const list = [];
    for (let i = 1; i <= n; i++) {
      const a = await contract.agents(i);
      const [score, count] = await contract.getReputation(i);
      list.push({
        id: i, name: a.name, specialty: a.specialty, owner: a.owner,
        reputation: Number(score) / 100, ratings: Number(count),
      });
    }
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/tasks", async (_req, res) => {
  try {
    const n = Number(await contract.taskCount());
    const list = [];
    for (let i = 1; i <= n; i++) {
      const t = await contract.tasks(i);
      list.push({
        id: i, agentId: Number(t.agentId), user: t.user, description: t.description,
        status: STATUS[Number(t.status)], rating: Number(t.rating),
      });
    }
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Simulated AI execution. Replace the body of runAgent() with a call to a real AI model.
async function runAgent(description) {
  await new Promise((r) => setTimeout(r, 600));
  return `Simulated result for: "${description}"`;
}

app.post("/api/run", async (req, res) => {
  const { description } = req.body || {};
  if (!description) return res.status(400).json({ error: "description is required" });
  try {
    res.json({ result: await runAgent(description), finishedAt: new Date().toISOString() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
