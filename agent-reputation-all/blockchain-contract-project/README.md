# AI Agent Identity & Reputation on Blockchain

A full-stack dApp that gives AI agents a unique on-chain identity and a reputation score
calculated as the average of user ratings.

**Stack:** Solidity · Ethereum (Hardhat local network) · Hardhat · React.js (Vite) · Node.js · Express.js · MetaMask · Ethers.js · HTML/CSS

## Project structure

```
agent-reputation-dapp/
├── contracts/AgentReputation.sol   Smart contract (the 5 functions)
├── scripts/deploy.js               Deploys and writes address + ABI for frontend and backend
├── test/AgentReputation.test.js    Contract tests (includes the 5,4,5,3 = 4.25 example)
├── hardhat.config.js
├── package.json
├── backend/                        Express API: /api/run, /api/agents, /api/tasks
│   ├── server.js
│   └── package.json
└── frontend/                       React UI (MetaMask + Ethers.js)
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/ (main.jsx, App.jsx, styles.css, contract.json)
```

## Smart contract functions

| Function | Purpose |
| --- | --- |
| `registerAgent(name, specialty)` | Registers a new AI agent; caller wallet becomes its owner |
| `createTask(agentId, description)` | Creates a new task |
| `completeTask(taskId)` | Marks a task completed (agent owner only) |
| `rateTask(taskId, rating)` | Rates a completed task 1 to 5 (task creator only, once) |
| `getReputation(agentId)` | Returns average rating x100 (425 = 4.25) and rating count |

## Run it locally

You need Node.js 18+ and the MetaMask browser extension.

```bash
# 1. Install and test the contract
npm install
npx hardhat test

# 2. Start a local blockchain (keep this terminal open)
npx hardhat node

# 3. In a second terminal: deploy (writes contract.json into frontend/ and backend/)
npm run deploy:local

# 4. Third terminal: backend
cd backend && npm install && npm start

# 5. Fourth terminal: frontend
cd frontend && npm install && npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

### MetaMask setup for the local network

1. Add a network: RPC URL `http://127.0.0.1:8545`, Chain ID `31337`, currency `ETH`.
2. Import one or two of the test accounts printed by `npx hardhat node` (use their private keys).
3. Use **account A** to register an agent and create a task.
   Use **account B** (the agent owner) to run and complete it, then switch to **account A** to rate.
   The same account can do every step if you prefer. The contract only checks the roles above.

## Public test network (optional)

Copy `.env.example` to `.env`, fill in `SEPOLIA_RPC_URL` and `PRIVATE_KEY`, then run `npm run deploy:sepolia`.
Point the backend at the same network with `RPC_URL=<your rpc url> npm start`.

## Notes

- `backend/server.js` simulates AI execution in `runAgent()`. Replace it with a real model call (future scope).
- Limitations: a wallet is required, transactions cost gas, and fake ratings are still possible
  (one rating per task, but nothing stops a user creating many tasks). See the project's future scope.
