// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProofOfExistence
 * @dev 文件存在性证明智能合约
 * 
 * 功能:
 * - 登记文件的 SHA-256 哈希到区块链
 * - 验证文件是否已登记
 * - 记录文件的元数据（加密方式、IPFS CID、大小、MIME类型）
 * 
 * 注意:
 * - 链上只存储文件哈希，不存储文件内容
 * - 文件内容应在链下加密存储（本地或 IPFS）
 * - 任何人都可以验证文件是否存在
 */
contract ProofOfExistence {
    /**
     * @dev 文件登记事件
     * @param owner 文件所有者地址
     * @param fileHash 文件的 SHA-256 哈希
     * @param cipher 加密方式描述
     * @param cid IPFS CID（可选）
     * @param size 文件大小（字节）
     * @param mime MIME 类型
     */
    event FileRegistered(
        address indexed owner,
        bytes32 indexed fileHash,
        string  cipher,   // 例如 "AES-256-GCM+PBKDF2(250k, SHA-256)"
        string  cid,      // 可选：加密文件的 IPFS CID（MVP可以先留空）
        uint256 size,
        string  mime
    );

    /**
     * @dev 文件哈希到所有者的映射
     * fileHash => owner address
     */
    mapping(bytes32 => address) public ownerOf;

    /**
     * @dev 登记文件哈希
     * @param fileHash 文件的 SHA-256 哈希
     * @param cipher 加密方式描述
     * @param cid IPFS CID（可选，如果为空字符串则忽略）
     * @param size 文件大小（字节）
     * @param mime MIME 类型
     * 
     * 要求:
     * - 文件哈希必须未被登记过
     * - 调用者必须拥有足够的 gas
     */
    function register(
        bytes32 fileHash,
        string calldata cipher,
        string calldata cid,
        uint256 size,
        string calldata mime
    ) external {
        require(ownerOf[fileHash] == address(0), "already registered");
        ownerOf[fileHash] = msg.sender;
        emit FileRegistered(msg.sender, fileHash, cipher, cid, size, mime);
    }

    /**
     * @dev 检查文件是否已登记
     * @param fileHash 文件的 SHA-256 哈希
     * @return 如果文件已登记返回 true，否则返回 false
     */
    function exists(bytes32 fileHash) external view returns (bool) {
        return ownerOf[fileHash] != address(0);
    }
}
