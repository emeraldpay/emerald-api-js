module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    testEnvironmentOptions: {
        url: "http://insights.emerald.test"
    },
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