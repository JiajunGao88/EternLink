/**
 * Test component without any external dependencies
 */

export default function TestComponent() {
  return (
    <div style={{ padding: '40px', backgroundColor: '#0a1628', minHeight: '100vh', color: 'white' }}>
      <h1>Test Component</h1>
      <p>If you can see this, React rendering works fine.</p>
      <p>The issue is with the secretSharing module import.</p>
    </div>
  );
}
