import ScoreManager from '../../src/scores/ScoreManager'

import { getScores } from '../../src/scores/Scores'
import FlairManager from '../../src/scores/ScoreFlairManager'
import DatabaseManager from '../../src/scores/DatabaseManager'

import { mocked } from 'ts-jest/utils'
import { ScoreManager as ScoreManagerType } from '../../src/types'

jest.mock('../../src/scores/Scores')
jest.mock('../../src/scores/ScoreFlairManager')
jest.mock('../../src/scores/DatabaseManager')

describe('ScoreManager', () => {
  const mockRedditBot = ({ readOnly: false } as any)
  let mockFlairManager, mockDatabaseManager
  let scoreManager: ScoreManagerType

  beforeEach(async () => {
    mocked(getScores).mockReturnValue({ guesser: 3, submitter: 7 })
    mockFlairManager = {
      getPoints: jest.fn().mockReturnValue(13),
      setPoints: jest.fn()
    }
    mockDatabaseManager = {
      getUserID: jest.fn(),
      recordWin: jest.fn(),
      editPoints: jest.fn(),
      deleteWin: jest.fn(),
      getUserScore: jest.fn().mockResolvedValue(45),
      getUserGuessCount: jest.fn(),
      getUserSubmissionCount: jest.fn()
    }
    mocked(FlairManager).mockReturnValue(mockFlairManager)
    mocked(DatabaseManager).mockResolvedValue(mockDatabaseManager)

    scoreManager = await ScoreManager(mockRedditBot)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserPoints', () => {
    it('calls the database method', async () => {
      const points = await scoreManager.getUserPoints("guesser")
      expect(points).toBe(45)
      expect(mockDatabaseManager.getUserScore).toHaveBeenCalledWith("guesser")
    })
  })

  describe('recordWin', () => {
    it(`fetches the user's existing score from the database`, async () => {
      await scoreManager.recordWin("postID", "guesser", "submitter", false)
      expect(mockDatabaseManager.getUserScore).toHaveBeenCalledTimes(2)
      expect(mockDatabaseManager.getUserScore).toHaveBeenCalledWith("guesser")
      expect(mockDatabaseManager.getUserScore).toHaveBeenCalledWith("submitter")
    })

    it(`sets user's flair to their new total`, async () => {
      await scoreManager.recordWin("postID", "guesser", "submitter", false)
      expect(mockFlairManager.setPoints).toHaveBeenCalledWith("guesser", 48)
      expect(mockFlairManager.setPoints).toHaveBeenCalledWith("submitter", 52)
    })

    it(`sends win to the database manager`, async () => {
      await scoreManager.recordWin("postID", "guesser", "submitter", false)
      expect(mockDatabaseManager.recordWin).toHaveBeenCalledWith("postID", "guesser", "submitter", { guesser: 3, submitter: 7 })
    })

    it('does not update anything if the bot is in read-only mode', async () => {
      await (await ScoreManager({ readOnly: true } as any)).recordWin("postID", "guesser", "submitter", false)
      expect(mockFlairManager.getPoints).not.toHaveBeenCalled()
      expect(mockFlairManager.setPoints).not.toHaveBeenCalled()
      expect(mockDatabaseManager.recordWin).not.toHaveBeenCalled()
    })
  })

  describe('removeWin', () => {
    it('removes the win from the database', async () => {
      await scoreManager.removeWin("postID")
      expect(mockDatabaseManager.deleteWin).toHaveBeenCalledWith("postID")
    })

    it.todo('updates the user flairs')

    it('does not update anything if the bot is in read-only mode', async () => {
      await (await ScoreManager({ readOnly: true } as any)).removeWin("postID")
      expect(mockFlairManager.getPoints).not.toHaveBeenCalled()
      expect(mockFlairManager.setPoints).not.toHaveBeenCalled()
      expect(mockDatabaseManager.deleteWin).not.toHaveBeenCalled()
    })
  })

  describe('updatePoints', () => {
    it('updates the points in the database', async () => {
      await scoreManager.updatePoints("postID", true)
      expect(mockDatabaseManager.editPoints).toHaveBeenCalledWith("postID", { guesser: 3, submitter: 7 })
    })

    it.todo('updates the user flairs')

    it('does not update anything if the bot is in read-only mode', async () => {
      await (await ScoreManager({ readOnly: true } as any)).updatePoints("postID", true)
      expect(mockFlairManager.getPoints).not.toHaveBeenCalled()
      expect(mockFlairManager.setPoints).not.toHaveBeenCalled()
      expect(mockDatabaseManager.editPoints).not.toHaveBeenCalled()
    })
  })
})