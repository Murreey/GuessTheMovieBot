import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['test'],
  setupFilesAfterEnv: ['./test/setup.ts']
}

export default config