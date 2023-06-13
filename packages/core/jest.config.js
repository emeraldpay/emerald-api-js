module.exports = {
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: './coverage/',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/lib/', '<rootDir>/node_modules/'],
};
