// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProofOfExistenceV2
 * @dev 文件存在性证明智能合约 - 支持 SSS 密钥分片
 * 
 * 功能:
 * - 登记文件的 SHA-256 哈希到区块链
 * - 存储密钥份额 3 (keyShare3) 用于 2-of-3 恢复
 * - 验证文件是否已登记
 * - 获取密钥份额用于解密
 * 
 * 安全性:
 * - 链上只存储文件哈希和密钥份额 3
 * - 单个份额无法解密文件（需要 2-of-3）
 * - 文件内容从不上链
 */
contract ProofOfExistenceV2 {
    /**
     * @dev 文件记录结构
     */
    struct FileRecord {
        address owner;           // 所有者地址
        string cipher;           // 加密方式
        string keyShare3;        // 密钥份额 3 (SSS)
        uint256 size;            // 文件大小
        string mime;             // MIME 类型
        uint256 timestamp;       // 注册时间
        bool exists;             // 是否存在
    }

    /**
     * @dev 文件登记事件
     */
    event FileRegistered(
        address indexed owner,
        bytes32 indexed fileHash,
        string cipher,
        string keyShare3,
        uint256 size,
        string mime,
        uint256 timestamp
    );

    /**
     * @dev 文件哈希到记录的映射
     */
    mapping(bytes32 => FileRecord) public files;

    /**
     * @dev 登记文件
     * @param fileHash 文件的 SHA-256 哈希
     * @param cipher 加密方式描述
     * @param keyShare3 密钥份额 3 (SSS)
     * @param size 文件大小
     * @param mime MIME 类型
     */
    function register(
        bytes32 fileHash,
        string calldata cipher,
        string calldata keyShare3,
        uint256 size,
        string calldata mime
    ) external {
        require(!files[fileHash].exists, "already registered");
        
        files[fileHash] = FileRecord({
            owner: msg.sender,
            cipher: cipher,
            keyShare3: keyShare3,
            size: size,
            mime: mime,
            timestamp: block.timestamp,
            exists: true
        });

        emit FileRegistered(
            msg.sender,
            fileHash,
            cipher,
            keyShare3,
            size,
            mime,
            block.timestamp
        );
    }

    /**
     * @dev 检查文件是否存在
     */
    function exists(bytes32 fileHash) external view returns (bool) {
        return files[fileHash].exists;
    }

    /**
     * @dev 获取文件的 keyShare3
     * @param fileHash 文件哈希
     * @return keyShare3 密钥份额 3
     */
    function getKeyShare(bytes32 fileHash) external view returns (string memory) {
        require(files[fileHash].exists, "file not found");
        return files[fileHash].keyShare3;
    }

    /**
     * @dev 获取文件完整记录
     */
    function getFileRecord(bytes32 fileHash) external view returns (
        address owner,
        string memory cipher,
        string memory keyShare3,
        uint256 size,
        string memory mime,
        uint256 timestamp
    ) {
        require(files[fileHash].exists, "file not found");
        FileRecord memory record = files[fileHash];
        return (
            record.owner,
            record.cipher,
            record.keyShare3,
            record.size,
            record.mime,
            record.timestamp
        );
    }
}

