module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ["test"],
  setupFilesAfterEnv: ["./test/setup.ts"]
};