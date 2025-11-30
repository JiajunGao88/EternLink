# Testing Guide for EternLink

This document describes the testing strategy and how to run tests for the EternLink project.

## Test Structure

```
src/
├── utils/
│   └── crypto.test.ts       # Unit tests for encryption utilities
├── test/
│   ├── setup.ts             # Test environment setup
│   └── integration.test.ts  # Integration tests for full workflows
├── App.test.tsx             # Component tests for React App
└── ...
```

## Testing Stack

- **Test Runner**: Vitest
- **Testing Library**: @testing-library/react
- **Coverage**: Vitest Coverage (v8)
- **UI**: @vitest/ui

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with UI

```bash
npm run test:ui
```

Then visit: http://localhost:51204/__vitest__/

### Run Tests with Coverage

```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory.

### Run Specific Test File

```bash
npm test -- crypto.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --grep="encryption"
```

## Test Categories

### 1. Unit Tests (crypto.test.ts)

Tests for individual encryption utility functions:

- **SHA-256 Hashing**
  - Consistent hash generation
  - Different hashes for different inputs
  - Hex string conversion

- **Key Derivation (PBKDF2)**
  - AES key generation from password
  - Deterministic key derivation
  - Salt-based key differentiation

- **File Encryption/Decryption**
  - Successful encryption/decryption cycle
  - Wrong password rejection
  - Randomized encryption output

- **File Packing/Unpacking**
  - Pack/unpack correctness
  - Data integrity through cycles
  - Correct .enc file format

- **Edge Cases**
  - Empty files
  - Large files (1MB)
  - Special characters in passwords
  - Unicode content

**Run only crypto tests:**
```bash
npm test -- crypto.test
```

### 2. Component Tests (App.test.tsx)

Tests for React component behavior:

- **Initial Render**
  - Main UI elements rendering
  - Configuration inputs
  - Buttons and labels

- **User Interactions**
  - Contract address input
  - Chain ID configuration
  - File upload
  - Password input

- **Button States**
  - Disabled states when missing inputs
  - Enabled states when ready
  - Loading states during processing

- **Status Messages**
  - Success messages
  - Error messages
  - Info messages

- **Accessibility**
  - Proper labels
  - ARIA attributes
  - Keyboard navigation

**Run only component tests:**
```bash
npm test -- App.test
```

### 3. Integration Tests (integration.test.ts)

End-to-end workflow testing:

- **Complete Workflows**
  - Full encryption and verification flow
  - Multiple files with different passwords
  - File existence verification simulation

- **Performance Tests**
  - Encryption time < 1 second (100KB files)
  - Hash calculation time < 100ms

- **Error Handling**
  - Corrupted file handling
  - Invalid password rejection
  - Tampered data detection

- **Data Integrity**
  - Multiple pack/unpack cycles
  - Consistent hash generation

**Run only integration tests:**
```bash
npm test -- integration.test
```

## Test Coverage Goals

| Module | Target Coverage |
|--------|----------------|
| crypto.ts | 90%+ |
| contract.ts | 80%+ (blockchain mocked) |
| App.tsx | 70%+ |
| Overall | 75%+ |

## Writing New Tests

### Example: Testing a Utility Function

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('MyFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle edge case', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### Example: Testing React Component

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

it('should handle user click', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);

  const button = screen.getByRole('button');
  await user.click(button);

  expect(screen.getByText('Clicked!')).toBeInTheDocument();
});
```

## Continuous Integration

Tests should run on every PR and commit to main branch.

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --run
      - run: npm run test:coverage
```

## Debugging Tests

### Run Single Test

```bash
npm test -- --grep="specific test name"
```

### Run with Console Logs

```bash
npm test -- --reporter=verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal"
}
```

## Common Issues

### Issue: Tests timing out

**Solution**: Increase timeout for slow tests
```typescript
it('slow test', async () => {
  // ...
}, { timeout: 10000 }); // 10 seconds
```

### Issue: "crypto is not defined"

**Solution**: Check `src/test/setup.ts` has crypto polyfill

### Issue: Component tests failing

**Solution**: Ensure proper mocking of external dependencies

## Test Data

### Sample Test Files

Located in `src/test/fixtures/` (create if needed):
- `sample.txt` - Small text file
- `large.txt` - Large file for performance testing
- `unicode.txt` - File with special characters

### Mock Data

```typescript
// Mock contract address
const MOCK_CONTRACT = '0x1234567890123456789012345678901234567890';

// Mock transaction hash
const MOCK_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

// Mock wallet address
const MOCK_WALLET = '0x9876543210987654321098765432109876543210';
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clear Names**: Test names should describe what they test
3. **Arrange-Act-Assert**: Follow AAA pattern
4. **Mock External Dependencies**: Don't rely on blockchain/network in tests
5. **Test Edge Cases**: Empty inputs, large inputs, special characters
6. **Async/Await**: Always handle promises properly
7. **Cleanup**: Clean up after each test

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Web Crypto API Testing](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

## Current Test Results

As of last run:
- **Total Tests**: 51
- **Passed**: 23
- **Failed**: 28 (mostly UI text mismatches due to localization)
- **Coverage**: ~60%

**Priority Fixes Needed**:
1. Update component tests to match Chinese UI text
2. Add more contract interaction tests
3. Improve error handling test coverage
