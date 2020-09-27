module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testPathIgnorePatterns: [
        "<rootDir>/lib/",
        "<rootDir>/node_modules/",
        // "__integration-tests__"
    ],
    coverageDirectory: "./coverage/",
    collectCoverageFrom: [
        "src/**/*.ts"
    ],
};