// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AI Agent Identity & Reputation
/// @notice Registers AI agents with unique IDs, records tasks and ratings,
///         and calculates reputation as the average rating.
contract AgentReputation {
    enum Status { Created, Completed, Rated }

    struct Agent {
        uint256 id;
        string name;
        string specialty;
        address owner;
        uint256 totalPoints;
        uint256 ratingCount;
    }

    struct Task {
        uint256 id;
        uint256 agentId;
        address user;
        string description;
        Status status;
        uint8 rating;
    }

    uint256 public agentCount;
    uint256 public taskCount;
    mapping(uint256 => Agent) public agents;
    mapping(uint256 => Task) public tasks;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string name);
    event TaskCreated(uint256 indexed taskId, uint256 indexed agentId, address indexed user);
    event TaskCompleted(uint256 indexed taskId, uint256 indexed agentId);
    event TaskRated(uint256 indexed taskId, uint256 indexed agentId, uint8 rating, uint256 newScoreX100);

    /// @notice Registers a new AI agent. The caller's wallet becomes its owner.
    function registerAgent(string calldata name, string calldata specialty) external returns (uint256 id) {
        require(bytes(name).length > 0, "Name required");
        id = ++agentCount;
        agents[id] = Agent(id, name, specialty, msg.sender, 0, 0);
        emit AgentRegistered(id, msg.sender, name);
    }

    /// @notice Creates a task for an agent.
    function createTask(uint256 agentId, string calldata description) external returns (uint256 id) {
        require(agentId > 0 && agentId <= agentCount, "Unknown agent");
        require(bytes(description).length > 0, "Description required");
        id = ++taskCount;
        tasks[id] = Task(id, agentId, msg.sender, description, Status.Created, 0);
        emit TaskCreated(id, agentId, msg.sender);
    }

    /// @notice Marks a task as completed. Only the agent's owner can do this.
    function completeTask(uint256 taskId) external {
        Task storage t = tasks[taskId];
        require(t.id != 0, "Unknown task");
        require(agents[t.agentId].owner == msg.sender, "Only agent owner");
        require(t.status == Status.Created, "Not open");
        t.status = Status.Completed;
        emit TaskCompleted(taskId, t.agentId);
    }

    /// @notice Rates a completed task from 1 to 5. Only the task creator can rate, once.
    function rateTask(uint256 taskId, uint8 rating) external {
        Task storage t = tasks[taskId];
        require(t.id != 0, "Unknown task");
        require(t.user == msg.sender, "Only task creator");
        require(t.status == Status.Completed, "Task not completed");
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");

        t.status = Status.Rated;
        t.rating = rating;

        Agent storage a = agents[t.agentId];
        a.totalPoints += rating;
        a.ratingCount += 1;

        emit TaskRated(taskId, t.agentId, rating, (a.totalPoints * 100) / a.ratingCount);
    }

    /// @notice Returns reputation as average rating x100 (425 = 4.25) and the number of ratings.
    function getReputation(uint256 agentId) external view returns (uint256 scoreX100, uint256 count) {
        Agent storage a = agents[agentId];
        count = a.ratingCount;
        scoreX100 = count == 0 ? 0 : (a.totalPoints * 100) / count;
    }
}
