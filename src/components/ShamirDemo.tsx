/**
 * Shamir's Secret Sharing Demo Component
 * Design matches EternLink logo theme
 */

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  splitPassword,
  reconstructPassword,
  formatShareForQRCode,
  storeShareOne,
  retrieveShareOne,
  listStoredShares,
  type PasswordShares
} from '../utils/secretSharing';

export default function ShamirDemo() {
  const [password, setPassword] = useState('');
  const [shares, setShares] = useState<PasswordShares | null>(null);
  const [fileHash, setFileHash] = useState('');
  const [reconstructShare1, setReconstructShare1] = useState('');
  const [reconstructShare2, setReconstructShare2] = useState('');
  const [reconstructedPassword, setReconstructedPassword] = useState('');
  const [error, setError] = useState('');
  const [storedShares, setStoredShares] = useState<string[]>([]);

  const handleSplit = () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      const newShares = splitPassword(password);
      setShares(newShares);
    } catch (err) {
      setError('Failed to split password: ' + (err as Error).message);
    }
  };

  const handleStoreShare1 = () => {
    if (!shares || !fileHash) {
      setError('Please split password first and provide a file hash');
      return;
    }

    try {
      storeShareOne(fileHash, shares.shareOne);
      setError('');
      updateStoredShares();
      alert('✅ Share 1 stored successfully!');
    } catch (err) {
      setError('Failed to store share: ' + (err as Error).message);
    }
  };

  const handleRetrieveShare1 = () => {
    if (!fileHash) {
      setError('Please provide a file hash');
      return;
    }

    try {
      const retrieved = retrieveShareOne(fileHash);
      if (retrieved) {
        setReconstructShare1(retrieved);
        setError('');
        alert('✅ Share 1 retrieved from localStorage!');
      } else {
        setError('No share found for this file hash');
      }
    } catch (err) {
      setError('Failed to retrieve share: ' + (err as Error).message);
    }
  };

  const handleReconstruct = () => {
    if (!reconstructShare1 || !reconstructShare2) {
      setError('Please provide both shares');
      return;
    }

    try {
      const password = reconstructPassword(reconstructShare1, reconstructShare2);
      setReconstructedPassword(password);
      setError('');
    } catch (err) {
      setError('Failed to reconstruct password: ' + (err as Error).message);
    }
  };

  const updateStoredShares = () => {
    const shares = listStoredShares();
    setStoredShares(shares);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('✅ Copied to clipboard!');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%)',
      padding: '60px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <svg width="64" height="64" viewBox="0 0 240 240" fill="none">
            <path
              d="M120 40L60 70V120C60 160 85 195 120 220C155 195 180 160 180 120V70L120 40Z"
              stroke="var(--accent-primary)"
              strokeWidth="4"
              fill="none"
            />
            <path
              d="M90 120L105 135L150 90"
              stroke="var(--accent-secondary)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <h1 style={{
              fontSize: '42px',
              margin: 0,
              color: 'var(--accent-light)',
              fontWeight: '300',
              letterSpacing: '-0.5px'
            }}>
              Shamir's Secret Sharing
            </h1>
            <p style={{
              margin: '8px 0 0 0',
              color: 'var(--accent-primary)',
              fontSize: '16px',
              fontWeight: '300'
            }}>
              Three-Layer Security Architecture Demo
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '20px',
            marginBottom: '30px',
            backgroundColor: 'rgba(220, 53, 69, 0.15)',
            color: '#ff8a95',
            borderRadius: '12px',
            border: '1px solid rgba(220, 53, 69, 0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {/* Step 1: Split Password */}
        <section style={{
          backgroundColor: 'var(--card-bg)',
          backdropFilter: 'blur(20px)',
          padding: '40px',
          borderRadius: '16px',
          marginBottom: '30px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--card-border)'
        }}>
          <h2 style={{
            fontSize: '24px',
            marginBottom: '30px',
            color: 'var(--accent-light)',
            fontWeight: '300',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--bg-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              fontSize: '18px'
            }}>1</span>
            Split Password into 3 Shares
          </h2>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              color: 'var(--accent-secondary)',
              fontSize: '14px'
            }}>
              Master Password (minimum 8 characters):
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your master password"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '16px',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                fontFamily: 'monospace',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--accent-light)',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 157, 195, 0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--card-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            onClick={handleSplit}
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              backgroundColor: 'var(--accent-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(139, 157, 195, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-secondary)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 157, 195, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 157, 195, 0.3)';
            }}
          >
            🔀 Split Password
          </button>

          {/* Shares Display */}
          {shares && (
            <div style={{ marginTop: '40px' }}>
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(40, 167, 69, 0.15)',
                color: 'var(--accent-light)',
                borderRadius: '12px',
                marginBottom: '30px',
                border: '1px solid rgba(40, 167, 69, 0.3)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ fontSize: '16px', fontWeight: '500' }}>
                  ✅ Password successfully split into 3 shares!
                </div>
                <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--accent-secondary)' }}>
                  Any 2 shares can reconstruct the original password
                </div>
              </div>

              {/* Share Cards Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '20px'
              }}>
                {/* Share 1 */}
                <div style={{
                  padding: '24px',
                  backgroundColor: 'rgba(26, 41, 66, 0.6)',
                  borderRadius: '12px',
                  border: '1px solid rgba(139, 157, 195, 0.3)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    <span style={{ fontSize: '24px' }}>📱</span>
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      color: 'var(--accent-secondary)',
                      fontWeight: '500'
                    }}>
                      Share 1 - User Device
                    </h3>
                  </div>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--input-bg)',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    wordBreak: 'break-all',
                    color: 'var(--accent-primary)',
                    marginBottom: '12px',
                    maxHeight: '80px',
                    overflow: 'auto'
                  }}>
                    {shares.shareOne}
                  </div>
                  <button
                    onClick={() => copyToClipboard(shares.shareOne)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: 'rgba(139, 157, 195, 0.2)',
                      color: 'var(--accent-secondary)',
                      border: '1px solid rgba(139, 157, 195, 0.3)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(139, 157, 195, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(139, 157, 195, 0.2)';
                    }}
                  >
                    📋 Copy
                  </button>
                </div>

                {/* Share 2 */}
                <div style={{
                  padding: '24px',
                  backgroundColor: 'rgba(255, 193, 7, 0.15)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    <span style={{ fontSize: '24px' }}>📄</span>
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      color: '#ffd54f',
                      fontWeight: '500'
                    }}>
                      Share 2 - Beneficiary
                    </h3>
                  </div>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    wordBreak: 'break-all',
                    color: '#ffe082',
                    marginBottom: '12px',
                    maxHeight: '80px',
                    overflow: 'auto'
                  }}>
                    {shares.shareTwo}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => copyToClipboard(shares.shareTwo)}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        fontSize: '14px',
                        backgroundColor: 'rgba(255, 193, 7, 0.2)',
                        color: '#ffd54f',
                        border: '1px solid rgba(255, 193, 7, 0.4)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 193, 7, 0.3)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>

                  {/* QR Code */}
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <QRCodeSVG
                      value={formatShareForQRCode(shares.shareTwo, fileHash || 'demo-hash')}
                      size={120}
                      level="H"
                      includeMargin
                    />
                    <p style={{
                      margin: '8px 0 0 0',
                      fontSize: '11px',
                      color: '#666'
                    }}>
                      QR Code for offline storage
                    </p>
                  </div>
                </div>

                {/* Share 3 */}
                <div style={{
                  padding: '24px',
                  backgroundColor: 'rgba(23, 162, 184, 0.15)',
                  borderRadius: '12px',
                  border: '1px solid rgba(23, 162, 184, 0.3)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    <span style={{ fontSize: '24px' }}>🗂️</span>
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      color: '#4dd0e1',
                      fontWeight: '500'
                    }}>
                      Share 3 - File Metadata
                    </h3>
                  </div>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    wordBreak: 'break-all',
                    color: '#80deea',
                    marginBottom: '12px',
                    maxHeight: '80px',
                    overflow: 'auto'
                  }}>
                    {shares.shareThree}
                  </div>
                  <button
                    onClick={() => copyToClipboard(shares.shareThree)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: 'rgba(23, 162, 184, 0.2)',
                      color: '#4dd0e1',
                      border: '1px solid rgba(23, 162, 184, 0.4)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(23, 162, 184, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(23, 162, 184, 0.2)';
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Step 2: Store Share 1 */}
        {shares && (
          <section style={{
            backgroundColor: 'var(--card-bg)',
            backdropFilter: 'blur(20px)',
            padding: '40px',
            borderRadius: '16px',
            marginBottom: '30px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--card-border)'
          }}>
            <h2 style={{
              fontSize: '24px',
              marginBottom: '30px',
              color: 'var(--accent-light)',
              fontWeight: '300',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--bg-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '18px'
              }}>2</span>
              Store Share 1 in localStorage
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                color: 'var(--accent-secondary)',
                fontSize: '14px'
              }}>
                File Hash (identifier):
              </label>
              <input
                type="text"
                value={fileHash}
                onChange={(e) => setFileHash(e.target.value)}
                placeholder="e.g., 0xabc123..."
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '16px',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--accent-light)',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 157, 195, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--card-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleStoreShare1}
                style={{
                  padding: '14px 32px',
                  fontSize: '16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#34ce57';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#28a745';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                💾 Store Share 1
              </button>

              <button
                onClick={handleRetrieveShare1}
                style={{
                  padding: '14px 32px',
                  fontSize: '16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#0d8bff';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#007bff';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                📥 Retrieve Share 1
              </button>

              <button
                onClick={updateStoredShares}
                style={{
                  padding: '14px 32px',
                  fontSize: '16px',
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(139, 157, 195, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-secondary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                📋 List Stored Shares
              </button>
            </div>

            {storedShares.length > 0 && (
              <div style={{
                marginTop: '24px',
                padding: '20px',
                backgroundColor: 'rgba(26, 41, 66, 0.5)',
                borderRadius: '12px',
                border: '1px solid var(--card-border)'
              }}>
                <div style={{
                  marginBottom: '12px',
                  fontWeight: '500',
                  color: 'var(--accent-secondary)'
                }}>
                  Stored Shares in localStorage:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--accent-primary)' }}>
                  {storedShares.map((hash, idx) => (
                    <li key={idx} style={{
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}>
                      {hash}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Step 3: Reconstruct Password */}
        <section style={{
          backgroundColor: 'var(--card-bg)',
          backdropFilter: 'blur(20px)',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--card-border)'
        }}>
          <h2 style={{
            fontSize: '24px',
            marginBottom: '20px',
            color: 'var(--accent-light)',
            fontWeight: '300',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--bg-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              fontSize: '18px'
            }}>3</span>
            Reconstruct Password (Recovery)
          </h2>

          <p style={{
            marginBottom: '30px',
            color: 'var(--accent-secondary)',
            fontSize: '14px'
          }}>
            Simulate beneficiary recovery: Enter any 2 shares to reconstruct the password
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              color: 'var(--accent-secondary)',
              fontSize: '14px'
            }}>
              Share A:
            </label>
            <textarea
              value={reconstructShare1}
              onChange={(e) => setReconstructShare1(e.target.value)}
              placeholder="Paste Share 1, 2, or 3"
              rows={3}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '14px',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                fontFamily: 'monospace',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--accent-light)',
                resize: 'vertical',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 157, 195, 0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--card-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              color: 'var(--accent-secondary)',
              fontSize: '14px'
            }}>
              Share B:
            </label>
            <textarea
              value={reconstructShare2}
              onChange={(e) => setReconstructShare2(e.target.value)}
              placeholder="Paste another share (different from Share A)"
              rows={3}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '14px',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                fontFamily: 'monospace',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--accent-light)',
                resize: 'vertical',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 157, 195, 0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--card-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            onClick={handleReconstruct}
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#e64555';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#dc3545';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🔓 Reconstruct Password
          </button>

          {reconstructedPassword && (
            <div style={{
              marginTop: '30px',
              padding: '24px',
              backgroundColor: 'rgba(40, 167, 69, 0.15)',
              borderRadius: '12px',
              border: '1px solid rgba(40, 167, 69, 0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                marginBottom: '16px',
                fontWeight: '500',
                color: 'var(--accent-light)',
                fontSize: '18px'
              }}>
                ✅ Password Successfully Reconstructed!
              </div>
              <div style={{
                padding: '16px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#5ce07e',
                marginBottom: '16px',
                wordBreak: 'break-all'
              }}>
                {reconstructedPassword}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--accent-secondary)' }}>
                <div style={{ marginBottom: '8px' }}>
                  🔑 Original password: <strong style={{ color: 'var(--accent-light)' }}>{password}</strong>
                </div>
                <div>
                  Match: {reconstructedPassword === password ?
                    <strong style={{ color: '#5ce07e' }}>✅ YES</strong> :
                    <strong style={{ color: '#ff6b7a' }}>❌ NO</strong>
                  }
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Info Box */}
        <div style={{
          marginTop: '40px',
          padding: '30px',
          backgroundColor: 'rgba(23, 162, 184, 0.1)',
          borderRadius: '16px',
          border: '1px solid rgba(23, 162, 184, 0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{
            fontSize: '18px',
            marginBottom: '16px',
            color: 'var(--accent-light)',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💡 How It Works
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            color: 'var(--accent-secondary)',
            fontSize: '14px',
            lineHeight: '1.8'
          }}>
            <li>Password is split into 3 shares using Shamir's Secret Sharing</li>
            <li><strong style={{ color: 'var(--accent-light)' }}>Threshold: 2</strong> - Any 2 shares can reconstruct the password</li>
            <li>Single share alone reveals ZERO information about the password</li>
            <li>Share 1 stored locally, Share 2 given to beneficiary, Share 3 in encrypted file</li>
            <li>After timeout, beneficiary gets Share 3 via email and uses Share 2 to recover</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
