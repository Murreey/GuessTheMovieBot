import fs from 'fs'
import path from 'path'
import { mocked } from 'ts-jest/utils'

import * as fileManager from '../../src/scores/ScoreFileManager'

jest.mock('fs')
const mockFs = mocked(fs)
jest.mock('path')
const mockPath = mocked(path)

 describe('ScoreFileManager', () => {
  const mockDate = new Date(1623495600000)
  const _Date = global.Date
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as string)

  beforeEach(() => {
    mockFs.existsSync.mockReturnValue(true)
    mockFs.readFileSync.mockReturnValue("{}")
    mockPath.resolve.mockImplementation((dir, path) => 'root/scores')
  })

  describe('recordGuess', () => {
    it('fetches the correct score file for the month', () => {
      fileManager.recordGuess("username", 3)
      expect(mockFs.readFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", "utf8")
    })

    it('creates users scores with the correct totals', () => {
      fileManager.recordGuess("username", 3)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", JSON.stringify({
        username: {
          points: 3,
          guesses: 1,
          submissions: 0
        }
      }, null, 2))

      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/total.json", JSON.stringify({
        username: {
          points: 3,
          guesses: 1,
          submissions: 0
        }
      }, null, 2))
    })

    it('updates saved users scores with the correct new totals', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        username: {
          points: 38,
          submissions: 8,
          guesses: 25
        }
      }))

      fileManager.recordGuess("username", 3)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", JSON.stringify({
        username: {
          points: 41,
          submissions: 8,
          guesses: 26
        }
      }, null, 2))
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/total.json", JSON.stringify({
        username: {
          points: 41,
          submissions: 8,
          guesses: 26
        }
      }, null, 2))
    })
  })

  describe('deductGuess', () => {
    it('fetches the correct score file for the month', () => {
      fileManager.deductGuess("username")
      expect(mockFs.readFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", "utf8")
    })

    it('creates users scores with the correct totals', () => {
      fileManager.deductGuess("username")
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", JSON.stringify({
        username: {
          points: 0,
          guesses: 0,
          submissions: 0
        }
      }, null, 2))

      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/total.json", JSON.stringify({
        username: {
          points: 0,
          guesses: 0,
          submissions: 0
        }
      }, null, 2))
    })

    it('updates saved users scores with the correct new totals', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        username: {
          points: 38,
          submissions: 8,
          guesses: 25
        }
      }))

      fileManager.deductGuess("username")
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", JSON.stringify({
        username: {
          points: 38,
          submissions: 8,
          guesses: 24
        }
      }, null, 2))
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/total.json", JSON.stringify({
        username: {
          points: 38,
          submissions: 8,
          guesses: 24
        }
      }, null, 2))
    })
  })

  describe('recordSubmission', () => {
    it('fetches the correct score file for the month', () => {
      fileManager.recordSubmission("username", 3)
      expect(mockFs.readFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", "utf8")
    })

    it('creates users scores with the correct totals', () => {
      fileManager.recordSubmission("username", 3)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", JSON.stringify({
        username: {
          points: 3,
          guesses: 0,
          submissions: 1
        }
      }, null, 2))
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/total.json", JSON.stringify({
        username: {
          points: 3,
          guesses: 0,
          submissions: 1
        }
      }, null, 2))
    })

    it('updates saved users scores with the correct new totals', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        username: {
          points: 38,
          submissions: 8,
          guesses: 25
        }
      }))

      fileManager.recordSubmission("username", 3)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", JSON.stringify({
        username: {
          points: 41,
          submissions: 9,
          guesses: 25
        }
      }, null, 2))
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/total.json", JSON.stringify({
        username: {
          points: 41,
          submissions: 9,
          guesses: 25
        }
      }, null, 2))
    })
  })

  describe('deductSubmission', () => {
    it('fetches the correct score file for the month', () => {
      fileManager.deductSubmission("username")
      expect(mockFs.readFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", "utf8")
    })

    it('creates users scores with the correct totals', () => {
      fileManager.deductSubmission("username")
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", JSON.stringify({
        username: {
          points: 0,
          guesses: 0,
          submissions: 0
        }
      }, null, 2))

      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/total.json", JSON.stringify({
        username: {
          points: 0,
          guesses: 0,
          submissions: 0
        }
      }, null, 2))
    })

    it('updates saved users scores with the correct new totals', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        username: {
          points: 38,
          submissions: 8,
          guesses: 25
        }
      }))

      fileManager.deductSubmission("username")
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", JSON.stringify({
        username: {
          points: 38,
          submissions: 7,
          guesses: 25
        }
      }, null, 2))
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/total.json", JSON.stringify({
        username: {
          points: 38,
          submissions: 7,
          guesses: 25
        }
      }, null, 2))
    })
  })

  describe('recordPoints', () => {
    it('fetches the correct score file for the month', () => {
      fileManager.recordPoints("username", 3)
      expect(mockFs.readFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", "utf8")
    })

    it('creates users scores with the correct totals', () => {
      fileManager.recordPoints("username", 3)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", JSON.stringify({
        username: {
          points: 3,
          guesses: 0,
          submissions: 0
        }
      }, null, 2))
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/total.json", JSON.stringify({
        username: {
          points: 3,
          guesses: 0,
          submissions: 0
        }
      }, null, 2))
    })

    it('updates saved users scores with the correct new totals', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        username: {
          points: 38,
          submissions: 8,
          guesses: 25
        }
      }))

      fileManager.recordPoints("username", 3)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", JSON.stringify({
        username: {
          points: 41,
          submissions: 8,
          guesses: 25
        }
      }, null, 2))
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/total.json", JSON.stringify({
        username: {
          points: 41,
          submissions: 8,
          guesses: 25
        }
      }, null, 2))
    })

    it('works with negative numbers', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        username: {
          points: 38,
          submissions: 8,
          guesses: 25
        }
      }))

      fileManager.recordPoints("username", -12)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", JSON.stringify({
        username: {
          points: 26,
          submissions: 8,
          guesses: 25
        }
      }, null, 2))
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/total.json", JSON.stringify({
        username: {
          points: 26,
          submissions: 8,
          guesses: 25
        }
      }, null, 2))
    })

    it('does not go below 0 points', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        username: {
          points: 38,
          submissions: 8,
          guesses: 25
        }
      }))

      fileManager.recordPoints("username", -500)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/monthly/2021-jun.json", JSON.stringify({
        username: {
          points: 0,
          submissions: 8,
          guesses: 25
        }
      }, null, 2))
      expect(mockFs.writeFileSync).toHaveBeenCalledWith("root/scores/total.json", JSON.stringify({
        username: {
          points: 0,
          submissions: 8,
          guesses: 25
        }
      }, null, 2))
    })
  })

  describe('getFileName', () => {
    it('formats correctly', () => {
      expect(fileManager.getMonthlyFileName()).toBe('root/scores/monthly/2021-jun.json')
      expect(fileManager.getMonthlyFileName(new _Date(2000, 7))).toBe('root/scores/monthly/2000-jul.json')
      expect(fileManager.getMonthlyFileName(new _Date(2010, 140))).toBe('root/scores/monthly/2021-aug.json')
      expect(fileManager.getMonthlyFileName(new _Date(1999, 0))).toBe('root/scores/monthly/1999-jan.json')
      expect(fileManager.getMonthlyFileName(new _Date(2021, 10))).toBe('root/scores/monthly/2021-nov.json')
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })
})