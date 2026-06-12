module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@testing-library/react-native|expo|expo-status-bar|@expo-google-fonts)/)',
  ],
  setupFiles: ['./jest-setup.js'],
  // App integration tests render the full tree with fake timers; under full-suite
  // CPU load the default 5s can be exceeded even though they pass in isolation.
  testTimeout: 15000,
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
  },
}
