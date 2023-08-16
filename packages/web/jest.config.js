module.exports = {
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: './coverage/',
  preset: 'ts-jest',
  setupFiles: ['./jest.setup.js'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'https://api.emeraldpay.dev',
  },
  testPathIgnorePatterns: ['<rootDir>/lib/', '<rootDir>/node_modules/'],
};
