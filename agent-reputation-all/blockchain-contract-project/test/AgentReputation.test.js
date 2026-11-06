const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentReputation", function () {
  let c, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const F = await ethers.getContractFactory("AgentReputation");
    c = await F.deploy();
    await c.waitForDeployment();
    await c.registerAgent("SummarizerBot", "Text summaries");
  });

  it("registers an agent with a unique ID and owner", async function () {
    await c.connect(user).registerAgent("CodeHelper", "Code review");
    expect(await c.agentCount()).to.equal(2n);
    expect((await c.agents(2)).owner).to.equal(user.address);
  });

  it("calculates reputation as the average rating (5,4,5,3 = 4.25)", async function () {
    for (const r of [5, 4, 5, 3]) {
      await c.connect(user).createTask(1, "Summarize");
      const id = await c.taskCount();
      await c.completeTask(id);
      await c.connect(user).rateTask(id, r);
    }
    const [score, count] = await c.getReputation(1);
    expect(score).to.equal(425n);
    expect(count).to.equal(4n);
  });

  it("only the agent owner can complete a task", async function () {
    await c.connect(user).createTask(1, "Task");
    await expect(c.connect(user).completeTask(1)).to.be.revertedWith("Only agent owner");
  });

  it("only the task creator can rate, once, after completion", async function () {
    await c.connect(user).createTask(1, "Task");
    await expect(c.connect(user).rateTask(1, 5)).to.be.revertedWith("Task not completed");
    await c.completeTask(1);
    await expect(c.rateTask(1, 5)).to.be.revertedWith("Only task creator");
    await expect(c.connect(user).rateTask(1, 6)).to.be.revertedWith("Rating must be 1-5");
    await c.connect(user).rateTask(1, 5);
    await expect(c.connect(user).rateTask(1, 4)).to.be.revertedWith("Task not completed");
  });
});
