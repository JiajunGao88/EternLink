/**
 * Express API Server for EternLink
 * Handles file registration and verification on blockchain
 */

const express = require('express');
const cors = require('cors');
const { registerFile, checkFileExists } = require('./register');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'EternLink API' });
});

// Register file hash on blockchain
app.post('/api/register', async (req, res) => {
  try {
    const { fileHash, cipher, cid, size, mime } = req.body;
    
    if (!fileHash) {
      return res.status(400).json({ 
        success: false, 
        error: 'fileHash is required' 
      });
    }
    
    const result = await registerFile(
      fileHash,
      cipher || 'AES-256-GCM+PBKDF2(250k, SHA-256)',
      cid || '',
      size || 0,
      mime || 'text/plain'
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check if file exists on blockchain
app.get('/api/verify/:fileHash', async (req, res) => {
  try {
    const { fileHash } = req.params;
    
    if (!fileHash) {
      return res.status(400).json({ 
        success: false, 
        error: 'fileHash is required' 
      });
    }
    
    const result = await checkFileExists(fileHash);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`EternLink API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

