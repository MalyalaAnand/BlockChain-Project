import { useCallback, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import deployed from "./contract.json";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const STATUS = ["Created", "Completed", "Rated"];
const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [results, setResults] = useState({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [agentId, setAgentId] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async (c) => {
    const an = Number(await c.agentCount());
    const agentList = [];
    for (let i = 1; i <= an; i++) {
      const a = await c.agents(i);
      const [score, count] = await c.getReputation(i);
      agentList.push({
        id: i, name: a.name, specialty: a.specialty, owner: a.owner,
        score: Number(score) / 100, count: Number(count),
      });
    }
    setAgents(agentList);

    const tn = Number(await c.taskCount());
    const taskList = [];
    for (let i = 1; i <= tn; i++) {
      const t = await c.tasks(i);
      taskList.push({
        id: i, agentId: Number(t.agentId), user: t.user,
        description: t.description, status: Number(t.status), rating: Number(t.rating),
      });
    }
    setTasks(taskList.reverse());
  }, []);

  async function connect() {
    if (!window.ethereum) return setMsg("MetaMask not found. Install it to continue.");
    if (!deployed.address) return setMsg("No contract address found. Run the deploy script first.");
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const c = new Contract(deployed.address, deployed.abi, signer);
      setAccount(await signer.getAddress());
      setContract(c);
      await load(c);
      setMsg("");
    } catch (e) {
      setMsg(e.shortMessage || e.message);
    }
  }

  async function send(fn, okMsg) {
    setBusy(true);
    setMsg("Waiting for MetaMask confirmation…");
    try {
      const tx = await fn();
      await tx.wait();
      await load(contract);
      setMsg(okMsg);
    } catch (e) {
      setMsg(e.reason || e.shortMessage || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function registerAgent(e) {
    e.preventDefault();
    await send(() => contract.registerAgent(name, specialty), "Agent registered.");
    setName(""); setSpecialty("");
  }

  async function createTask(e) {
    e.preventDefault();
    await send(() => contract.createTask(agentId, description), "Task created.");
    setDescription("");
  }

  // Backend runs the AI task, then the agent owner records completion on-chain.
  async function runAndComplete(task) {
    setBusy(true);
    setMsg("Running agent on the backend…");
    try {
      const res = await fetch(`${API}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: task.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Backend error");
      setResults((r) => ({ ...r, [task.id]: data.result }));
      setBusy(false);
      await send(() => contract.completeTask(task.id), "Task completed on-chain.");
    } catch (e) {
      setMsg(e.reason || e.shortMessage || e.message);
      setBusy(false);
    }
  }

  const agentById = (id) => agents.find((a) => a.id === id);
  const lower = account.toLowerCase();

  return (
    <div className="app">
      <header>
        <div>
          <h1>AI Agent Identity &amp; Reputation</h1>
          <p>Unique agent IDs and tamper-resistant ratings on Ethereum</p>
        </div>
        {account ? (
          <span className="wallet">{short(account)}</span>
        ) : (
          <button onClick={connect}>Connect MetaMask</button>
        )}
      </header>

      {msg && <div className="notice">{msg}</div>}

      {!account ? (
        <p className="hint">Connect your wallet to register agents, create tasks and rate results.</p>
      ) : (
        <>
          <section className="forms">
            <form onSubmit={registerAgent}>
              <h2>Register agent</h2>
              <input required placeholder="Agent name" value={name} onChange={(e) => setName(e.target.value)} />
              <input placeholder="Specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
              <button disabled={busy}>registerAgent()</button>
            </form>
            <form onSubmit={createTask}>
              <h2>Create task</h2>
              <select required value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                <option value="">Choose an agent</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>#{a.id} {a.name}</option>
                ))}
              </select>
              <input required placeholder="Task description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <button disabled={busy}>createTask()</button>
            </form>
          </section>

          <h2>Agents</h2>
          <div className="grid">
            {agents.length === 0 && <p className="hint">No agents yet.</p>}
            {agents.map((a) => (
              <div className="card" key={a.id}>
                <div className="row">
                  <strong>#{a.id} {a.name}</strong>
                  <span className="score">{a.count ? a.score.toFixed(2) : "–"}<small>/5</small></span>
                </div>
                <div className="sub">{a.specialty || "General"} · owner {short(a.owner)}</div>
                <div className="sub">{a.count} rating{a.count === 1 ? "" : "s"}</div>
              </div>
            ))}
          </div>

          <h2>Tasks</h2>
          {tasks.length === 0 && <p className="hint">No tasks yet.</p>}
          {tasks.map((t) => {
            const a = agentById(t.agentId);
            const isOwner = a && a.owner.toLowerCase() === lower;
            const isUser = t.user.toLowerCase() === lower;
            return (
              <div className="card" key={t.id}>
                <div className="row">
                  <strong>#{t.id} {t.description}</strong>
                  <span className={`tag s${t.status}`}>{STATUS[t.status]}</span>
                </div>
                <div className="sub">Agent: {a ? a.name : t.agentId} · requested by {short(t.user)}</div>
                {results[t.id] && <pre>{results[t.id]}</pre>}
                {t.status === 0 && isOwner && (
                  <button disabled={busy} onClick={() => runAndComplete(t)}>Run agent &amp; completeTask()</button>
                )}
                {t.status === 1 && isUser && (
                  <div className="rate">
                    <span>rateTask():</span>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button key={v} disabled={busy} onClick={() => send(() => contract.rateTask(t.id, v), `Rated ${v}/5.`)}>{v}</button>
                    ))}
                  </div>
                )}
                {t.status === 2 && <div className="sub">Rated {t.rating}/5</div>}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
