import Scoreboards from '../../src/scores/Scoreboards'
import Mustache from 'mustache'
import * as fileManager from '../../src/scores/ScoreFileManager'

import { mocked } from 'ts-jest/utils'

jest.mock('Mustache')
jest.mock('../../src/scores/ScoreFileManager')

describe('Scoreboards', () => {
  let redditBot

  const mockDate = new Date(1623495600000)
  const _Date = global.Date
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as string)

  const mockFileManager = mocked(fileManager)
  const mockMustache = mocked(Mustache)

  beforeEach(() => {
    redditBot = {
      createPost: jest.fn()
    }

    mockFileManager.getMonthlyFileName.mockClear()
    mockFileManager.getScoreData.mockClear()
    mockFileManager.getScoreData.mockReturnValue({
      player1: { points: 10, guesses: 10, submissions: 10 },
      player2: { points: 20, guesses: 30, submissions: 40 },
      player3: { points: 70, guesses: 60, submissions: 50 },
      player4: { points: 20, guesses: 80, submissions: 10 },
      player5: { points: 1, guesses: 0, submissions: 0 },
      player6: { points: 0, guesses: 1, submissions: 0 },
    })
    mockMustache.render.mockClear()
    mockMustache.render.mockReturnValue('rendered-template')
  })

  describe('postScoreboard', () => {
    it('defaults to last month if no date specified', async () => {
      await Scoreboards(redditBot).postScoreboard()
      expect(mockFileManager.getMonthlyFileName).toHaveBeenCalledWith(new _Date("2021-05-31T11:00:00.000Z"))
    })

    it('opens the specified file if date is provided', async () => {
      await Scoreboards(redditBot).postScoreboard(new _Date(2010, 2, 5))
      expect(mockFileManager.getMonthlyFileName).toHaveBeenCalledWith(new _Date("2010-03-05T00:00:00.000Z"))
    })

    it('calls the bot with the correctly sorted and formatted data', async () => {
      await Scoreboards(redditBot).postScoreboard()
      expect(mockMustache.render).toHaveBeenCalledWith(expect.anything(), {
        month: "April",
        year: "2021",
        guesses: [
          { score: 80, username: "player4", },
          { score: 60, username: "player3", },
          { score: 30, username: "player2", },
          { score: 10, username: "player1", },
          { score: 1, username: "player6", },
        ],
        points: [
          { score: 70, username: "player3", },
          { score: 20, username: "player2", },
          { score: 20, username: "player4", },
          { score: 10, username: "player1", },
          { score: 1, username: "player5", },
        ],
        submissions: [
          { score: 50, username: "player3", },
          { score: 40, username: "player2", },
          { score: 10, username: "player1", },
          { score: 10, username: "player4", },
          { score: 0, username: "player5", },
        ]
      })
      expect(redditBot.createPost).toHaveBeenCalledWith('/r/GuessTheMovie April 2021 Leaderboard', 'rendered-template', true)
    })

    it('does not post if the score file is empty', async () => {
      mockFileManager.getScoreData.mockReturnValue(undefined)
      await Scoreboards(redditBot).postScoreboard()
      mockFileManager.getScoreData.mockReturnValue(null)
      await Scoreboards(redditBot).postScoreboard()
      mockFileManager.getScoreData.mockReturnValue({})
      await Scoreboards(redditBot).postScoreboard()
      expect(redditBot.createPost).not.toHaveBeenCalled()
    })
  })
})