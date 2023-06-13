module.exports = {
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: './coverage/',
  preset: 'ts-jest',
  setupFiles: ['./jest.setup.js'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://insights.emerald.test',
  },
  testPathIgnorePatterns: ['<rootDir>/lib/', '<rootDir>/node_modules/'],
};
