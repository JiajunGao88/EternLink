// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProofOfExistence with Dead Man's Switch
 * @dev 文件存在性证明 + 心跳检测 + 继承人触发
 */
contract ProofOfExistence {
    struct FileRecord {
        address owner;
        bytes32 fileHash;
        string cipher;
        string cid;
        uint256 size;
        string mime;
        uint256 registeredAt;
        uint256 lastHeartbeat;
        uint256 heartbeatInterval;
        address[] beneficiaries;
        bool recoveryTriggered;
    }

    mapping(bytes32 => FileRecord) public files;
    mapping(address => bytes32[]) public userFiles;

    event FileRegistered(
        address indexed owner,
        bytes32 indexed fileHash,
        string cipher,
        string cid,
        uint256 size,
        string mime,
        uint256 heartbeatInterval,
        address[] beneficiaries
    );

    event HeartbeatUpdated(
        bytes32 indexed fileHash,
        address indexed owner,
        uint256 timestamp
    );

    event RecoveryTriggered(
        bytes32 indexed fileHash,
        address indexed owner,
        address[] beneficiaries,
        uint256 timestamp
    );

    function register(
        bytes32 fileHash,
        string calldata cipher,
        string calldata cid,
        uint256 size,
        string calldata mime,
        uint256 heartbeatInterval,
        address[] calldata beneficiaries
    ) external {
        require(files[fileHash].owner == address(0), "already registered");
        require(beneficiaries.length > 0, "beneficiaries required");
        require(heartbeatInterval > 0, "interval required");

        files[fileHash] = FileRecord({
            owner: msg.sender,
            fileHash: fileHash,
            cipher: cipher,
            cid: cid,
            size: size,
            mime: mime,
            registeredAt: block.timestamp,
            lastHeartbeat: block.timestamp,
            heartbeatInterval: heartbeatInterval,
            beneficiaries: beneficiaries,
            recoveryTriggered: false
        });

        userFiles[msg.sender].push(fileHash);
        emit FileRegistered(
            msg.sender,
            fileHash,
            cipher,
            cid,
            size,
            mime,
            heartbeatInterval,
            beneficiaries
        );
    }

    function heartbeat(bytes32 fileHash) external {
        require(files[fileHash].owner == msg.sender, "not owner");
        files[fileHash].lastHeartbeat = block.timestamp;
        emit HeartbeatUpdated(fileHash, msg.sender, block.timestamp);
    }

    function checkTimeout(bytes32 fileHash) public view returns (bool) {
        FileRecord memory record = files[fileHash];
        if (record.owner == address(0)) {
            return false;
        }

        uint256 elapsed = block.timestamp - record.lastHeartbeat;
        return elapsed > record.heartbeatInterval;
    }

    function triggerRecovery(bytes32 fileHash) external {
        FileRecord storage record = files[fileHash];
        require(record.owner != address(0), "not found");
        require(!record.recoveryTriggered, "already triggered");
        require(checkTimeout(fileHash), "not timed out");

        record.recoveryTriggered = true;
        emit RecoveryTriggered(
            fileHash,
            record.owner,
            record.beneficiaries,
            block.timestamp
        );
    }

    function exists(bytes32 fileHash) external view returns (bool) {
        return files[fileHash].owner != address(0);
    }
}
