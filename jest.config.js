const path = require('path')

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@testing-library/react-native)/)',
  ],
  setupFiles: ['./jest-setup.js'],
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
  },
  resolver: require.resolve('@react-native/jest-preset/jest/resolver.js'),
}
