import ScoreManager from '../../src/scores/ScoreManager'

import { getScores } from '../../src/scores/Scores'
import FlairManager from '../../src/scores/ScoreFlairManager'
import * as fileManager from '../../src/scores/ScoreFileManager'

import { mocked } from 'ts-jest/utils'

jest.mock('../../src/scores/Scores')
jest.mock('../../src/scores/ScoreFlairManager')
jest.mock('../../src/scores/ScoreFileManager')

describe('ScoreManager', () => {
  const mockRedditBot = ({ readOnly: false } as any)
  let mockFlairManager

  beforeEach(() => {
    mocked(getScores).mockReturnValue({ guesser: 3, submitter: 7 })
    mocked(fileManager).getTotalFileName.mockReturnValue("file.json")
    mocked(fileManager).getScoreData.mockReturnValue({
      guesser: { points: 45 },
      submitter: { points: 23 }
    })
    mockFlairManager = {
      getPoints: jest.fn().mockReturnValue(13),
      setPoints: jest.fn()
    }
    mocked(FlairManager).mockReturnValue(mockFlairManager)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserPoints', () => {
    it('returns the users points from file if it exists', async () => {
      const points = await ScoreManager(mockRedditBot).getUserPoints("guesser")
      expect(points).toBe(45)
      expect(mockFlairManager.getPoints).not.toHaveBeenCalled()
    })

    it('fetches points from flair if not in the file', async () => {
      const points = await ScoreManager(mockRedditBot).getUserPoints("unknown")
      expect(mockFlairManager.getPoints).toHaveBeenCalled()
      expect(points).toBe(13)
    })

    it('returns 0 if flair could not be found', async () => {
      mockFlairManager.getPoints.mockReturnValue(undefined)
      const points = await ScoreManager(mockRedditBot).getUserPoints("unknown")
      expect(mockFlairManager.getPoints).toHaveBeenCalled()
      expect(points).toBe(0)
    })
  })

  describe('recordWin', () => {
    describe(`fetches the user's existing score`, () => {
      it('from file', async () => {
        await ScoreManager(mockRedditBot).recordWin("guesser", "submitter", false)
        expect(fileManager.getScoreData).toHaveBeenCalledWith("file.json")
        expect(mockFlairManager.getPoints).not.toHaveBeenCalled()
      })

      it('from flair if not present in the file', async () => {
        mocked(fileManager).getScoreData.mockReturnValue({})
        await ScoreManager(mockRedditBot).recordWin("guesser", "submitter", false)
        expect(mockFlairManager.getPoints).toHaveBeenCalledWith("guesser")
        expect(mockFlairManager.getPoints).toHaveBeenCalledWith("submitter")
      })
    })

    it(`sets user's flair to their new total`, async () => {
      await ScoreManager(mockRedditBot).recordWin("guesser", "submitter", false)
      expect(mockFlairManager.setPoints).toHaveBeenCalledWith("guesser", 48)
      expect(mockFlairManager.setPoints).toHaveBeenCalledWith("submitter", 30)
    })

    it(`sends new points to the file manager`, async () => {
      await ScoreManager(mockRedditBot).recordWin("guesser", "submitter", false)
      expect(fileManager.recordGuess).toHaveBeenCalledWith("guesser", 3)
      expect(fileManager.recordSubmission).toHaveBeenCalledWith("submitter", 7)
    })

    it('does not update anything if the bot is in read-only mode', async () => {
      await ScoreManager({ readOnly: true } as any).recordWin("guesser", "submitter", false)
      expect(mockFlairManager.getPoints).not.toHaveBeenCalled()
      expect(mockFlairManager.setPoints).not.toHaveBeenCalled()
      expect(fileManager.recordGuess).not.toHaveBeenCalled()
      expect(fileManager.recordSubmission).not.toHaveBeenCalled()
    })
  })

  describe('addPoints', () => {
    it(`sets user's flair to their new total`, async () => {
      await ScoreManager(mockRedditBot).addPoints("guesser", 15)
      expect(mockFlairManager.setPoints).toHaveBeenCalledWith("guesser", 60)
    })

    it('sends new points to the file manager', async () => {
      await ScoreManager(mockRedditBot).addPoints("guesser", 15)
      expect(fileManager.recordPoints).toHaveBeenCalledWith("guesser", 15)
    })

    it('does not update anything if the bot is in read-only mode', async () => {
      await ScoreManager({ readOnly: true } as any).addPoints("guesser", 15)
      expect(mockFlairManager.getPoints).not.toHaveBeenCalled()
      expect(mockFlairManager.setPoints).not.toHaveBeenCalled()
      expect(fileManager.recordPoints).not.toHaveBeenCalled()
    })
  })
})