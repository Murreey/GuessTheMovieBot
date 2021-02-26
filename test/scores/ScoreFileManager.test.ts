import fs from 'fs'
import { mocked } from 'ts-jest/utils'

import * as fileManager from '../../src/scores/ScoreFileManager'

jest.mock('fs')
const mockFs = mocked(fs)

 describe('ScoreSaver', () => {
  const mockDate = new Date(1623495600000)
  const realDate = global.Date
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as string)

  beforeEach(() => {
    mockFs.existsSync.mockReturnValue(true)
    mockFs.readFileSync.mockReturnValue("{}")
  })

  describe('recordGuess', () => {
    it('fetches the correct score file for the month', () => {
      fileManager.recordGuess("username", 3, 5)
      expect(mockFs.readFileSync).toHaveBeenCalledWith("./scores/2021-jun.json", "utf8")
    })

    it('creates users scores with the correct totals', () => {
      fileManager.recordGuess("username", 3, 5)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(expect.anything(), JSON.stringify({
        username: {
          points: 3,
          total: 5,
          submissions: 0,
          guesses: 1
        }
      }, null, 2))
    })

    it('updates saved users scores with the correct new totals', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        username: {
          points: 38,
          total: 320,
          submissions: 8,
          guesses: 25
        }
      }))

      fileManager.recordGuess("username", 3, 5)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(expect.anything(), JSON.stringify({
        username: {
          points: 41,
          total: 5,
          submissions: 8,
          guesses: 26
        }
      }, null, 2))
    })
  })

  describe('recordSubmission', () => {
    it('fetches the correct score file for the month', () => {
      fileManager.recordSubmission("username", 3, 5)
      expect(mockFs.readFileSync).toHaveBeenCalledWith("./scores/2021-jun.json", "utf8")
    })

    it('creates users scores with the correct totals', () => {
      fileManager.recordSubmission("username", 3, 5)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(expect.anything(), JSON.stringify({
        username: {
          points: 3,
          total: 5,
          submissions: 1,
          guesses: 0
        }
      }, null, 2))
    })

    it('updates saved users scores with the correct new totals', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        username: {
          points: 38,
          total: 320,
          submissions: 8,
          guesses: 25
        }
      }))

      fileManager.recordSubmission("username", 3, 5)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(expect.anything(), JSON.stringify({
        username: {
          points: 41,
          total: 5,
          submissions: 9,
          guesses: 25
        }
      }, null, 2))
    })
  })

  describe('getFileName', () => {
    it('formats correctly', () => {
      expect(fileManager.getFileName()).toBe('./scores/2021-jun.json')
      expect(fileManager.getFileName(new realDate(2000, 7))).toBe('./scores/2000-jul.json')
      expect(fileManager.getFileName(new realDate(2010, 140))).toBe('./scores/2021-aug.json')
      expect(fileManager.getFileName(new realDate(1999, 0))).toBe('./scores/1999-jan.json')
      expect(fileManager.getFileName(new realDate(2021, 10))).toBe('./scores/2021-nov.json')
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })
})