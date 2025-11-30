/**
 * Enhanced Shamir's Secret Sharing Demo Component
 * Incrementally adding features with logo-matching design
 */

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  splitPassword,
  type PasswordShares
} from '../utils/secretSharing';

export default function ShamirDemoEnhanced() {
  const [password, setPassword] = useState('');
  const [shares, setShares] = useState<PasswordShares | null>(null);
  const [fileHash] = useState('0xabc123def456'); // Demo file hash
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

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

  // Generate QR code when shares change
  useEffect(() => {
    if (shares) {
      // Only include the share itself in QR code, not the full formatted string
      QRCode.toDataURL(shares.shareTwo, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',  // Black for better scanning
          light: '#FFFFFF'  // White background
        },
        errorCorrectionLevel: 'M'
      })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('QR code generation failed:', err));
    }
  }, [shares, fileHash]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`✅ ${label} copied to clipboard!`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #0f1e2e 50%, #1a2942 100%)',
      padding: '60px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <h1 style={{
            fontSize: '42px',
            margin: 0,
            color: '#C0C8D4',
            fontWeight: '700'
          }}>
            Shamir's Secret Sharing
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#8b96a8',
            marginTop: '12px'
          }}>
            Split your password into 3 shares · Any 2 shares can reconstruct it
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '30px',
            maxWidth: '600px',
            margin: '0 auto 30px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Input Section */}
        <section style={{
          backgroundColor: 'rgba(26, 41, 66, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 157, 195, 0.2)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '40px',
          maxWidth: '600px',
          margin: '0 auto 40px'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#8b96a8',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Enter Password (minimum 8 characters)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a strong password..."
              style={{
                width: '100%',
                padding: '14px 16px',
                backgroundColor: 'rgba(15, 30, 46, 0.8)',
                border: '1px solid rgba(192, 200, 212, 0.3)',
                borderRadius: '8px',
                fontSize: '16px',
                color: '#C0C8D4',
                outline: 'none',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#C0C8D4'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(192, 200, 212, 0.3)'}
            />
          </div>

          <button
            onClick={handleSplit}
            disabled={!password}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: password ? 'linear-gradient(135deg, #A8B2C0 0%, #C0C8D4 100%)' : '#555',
              color: '#0a1628',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: password ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              opacity: password ? 1 : 0.5
            }}
          >
            🔐 Split Password into 3 Shares
          </button>
        </section>

        {/* Shares Display */}
        {shares && (
          <section>
            <h2 style={{
              fontSize: '24px',
              color: '#C0C8D4',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              Generated Shares
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {/* Share 1 - User Device */}
              <div style={{
                backgroundColor: 'rgba(26, 41, 66, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(139, 157, 195, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'rgba(139, 157, 195, 0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#8b9dc3'
                }}>
                  1
                </div>

                <h3 style={{
                  fontSize: '18px',
                  color: '#C0C8D4',
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  📱 Share 1
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: '#8b96a8',
                  marginBottom: '16px'
                }}>
                  Stored on User Device
                </p>

                <div style={{
                  backgroundColor: 'rgba(15, 30, 46, 0.8)',
                  border: '1px solid rgba(192, 200, 212, 0.2)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '12px'
                }}>
                  <code style={{
                    fontSize: '11px',
                    color: '#C0C8D4',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace'
                  }}>
                    {shares.shareOne}
                  </code>
                </div>

                <button
                  onClick={() => copyToClipboard(shares.shareOne, 'Share 1')}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'rgba(192, 200, 212, 0.2)',
                    border: '1px solid rgba(192, 200, 212, 0.3)',
                    borderRadius: '6px',
                    color: '#C0C8D4',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(192, 200, 212, 0.3)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(192, 200, 212, 0.2)'}
                >
                  📋 Copy Share 1
                </button>
              </div>

              {/* Share 2 - Beneficiary */}
              <div style={{
                backgroundColor: 'rgba(26, 41, 66, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '16px',
                padding: '24px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'rgba(255, 193, 7, 0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#ffc107'
                }}>
                  2
                </div>

                <h3 style={{
                  fontSize: '18px',
                  color: '#C0C8D4',
                  marginBottom: '8px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  📄 Share 2
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: '#8b96a8',
                  marginBottom: '24px',
                  textAlign: 'center'
                }}>
                  Given to Beneficiary (Offline)
                </p>

                {/* QR Code Display - Only show QR code */}
                {qrCodeUrl && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                      <img
                        src={qrCodeUrl}
                        alt="QR Code for Share 2"
                        style={{
                          width: '256px',
                          height: '256px',
                          display: 'block'
                        }}
                      />
                    </div>
                    <p style={{
                      fontSize: '12px',
                      color: '#8b96a8',
                      textAlign: 'center',
                      margin: 0
                    }}>
                      Scan to view beneficiary share
                    </p>
                  </div>
                )}
              </div>

              {/* Share 3 - File Metadata */}
              <div style={{
                backgroundColor: 'rgba(26, 41, 66, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(23, 162, 184, 0.3)',
                borderRadius: '16px',
                padding: '24px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'rgba(23, 162, 184, 0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#17a2b8'
                }}>
                  3
                </div>

                <h3 style={{
                  fontSize: '18px',
                  color: '#C0C8D4',
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  🗂️ Share 3
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: '#8b96a8',
                  marginBottom: '16px'
                }}>
                  Embedded in File Metadata
                </p>

                <div style={{
                  backgroundColor: 'rgba(15, 30, 46, 0.8)',
                  border: '1px solid rgba(192, 200, 212, 0.2)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '12px'
                }}>
                  <code style={{
                    fontSize: '11px',
                    color: '#C0C8D4',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace'
                  }}>
                    {shares.shareThree}
                  </code>
                </div>

                <button
                  onClick={() => copyToClipboard(shares.shareThree, 'Share 3')}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'rgba(192, 200, 212, 0.2)',
                    border: '1px solid rgba(192, 200, 212, 0.3)',
                    borderRadius: '6px',
                    color: '#C0C8D4',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(192, 200, 212, 0.3)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(192, 200, 212, 0.2)'}
                >
                  📋 Copy Share 3
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div style={{
              marginTop: '32px',
              padding: '20px',
              backgroundColor: 'rgba(192, 200, 212, 0.05)',
              border: '1px solid rgba(192, 200, 212, 0.15)',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <p style={{
                color: '#8b96a8',
                fontSize: '14px',
                margin: 0
              }}>
                ✅ Any 2 of these 3 shares can reconstruct your original password
              </p>
              <p style={{
                color: '#8b96a8',
                fontSize: '14px',
                margin: '8px 0 0',
                opacity: 0.7
              }}>
                A single share reveals zero information about the password
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
