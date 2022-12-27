import Scoreboards from '../../src/scores/Scoreboards'
import Mustache from 'mustache'

import { DatabaseManager, ScoreboardData } from '../../src/types'
import { RedditBot } from '../../src/RedditBot'
import { getConfig } from '../../src/config'

jest.mock('mustache')
jest.mock('../../src/config')

describe('Scoreboards', () => {
  let redditBot: Partial<RedditBot> = {
    createPost: jest.fn()
  }

  const mockDate = new Date(1623495600000) // 12/06/2021
  const _Date = global.Date
  global.Date = jest.fn((args) => new _Date(args || mockDate.getTime())) as any
  global.Date.UTC = _Date.UTC;

  const mockHighScores = {
    scores: [
      { username: 'player3', score: 25 },
      { username: 'player2', score: 12 },
      { username: 'player1', score: 5 }
    ],
    guessers: [
      { username: 'player3', score: 25 },
      { username: 'player2', score: 12 },
      { username: 'player1', score: 5 }
    ],
    submitters: [
      { username: 'player3', score: 25 },
      { username: 'player2', score: 12 },
      { username: 'player1', score: 5 }
    ],
    fastest: {
      postId: 'fastest-post', username: 'player4', time: 987654
    },
    slowest: {
      postId: 'slowest-post', username: 'player5', time: 12345678910
    }
  }

  const mockDatabaseManager: Partial<DatabaseManager> = {
    getHighScores: jest.fn().mockResolvedValue(mockHighScores)
  }

  const mockMustache = jest.mocked(Mustache)
  mockMustache.render.mockReturnValue('rendered-template')

  jest.mocked(getConfig).mockReturnValue({
    subreddit: 'subreddit_name'
  } as any)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('postMonthlyScoreboard', () => {
    it('defaults to last month if no date specified', async () => {
      await Scoreboards(redditBot as RedditBot, mockDatabaseManager as DatabaseManager).postMonthlyScoreboard()
      expect(mockDatabaseManager.getHighScores).toHaveBeenCalledWith({
        from: new _Date('2021-05-01T00:00:00.000Z'),
        to: new _Date('2021-06-01T00:00:00.000Z')
      }, 5)
    })

    it('requests the right time range if a month is provided', async () => {
      await Scoreboards(redditBot as RedditBot, mockDatabaseManager as DatabaseManager).postMonthlyScoreboard(new _Date(2010, 2, 5))
      expect(mockDatabaseManager.getHighScores).toHaveBeenCalledWith({
        from: new _Date('2010-02-01T00:00:00.000Z'),
        to: new _Date('2010-03-01T00:00:00.000Z')
      }, 5)
    })

    it('calls the bot with the correctly formatted data', async () => {
      await Scoreboards(redditBot as RedditBot, mockDatabaseManager as DatabaseManager).postMonthlyScoreboard()
      expect(mockMustache.render).toHaveBeenCalledWith(expect.anything(), {
        month: "May",
        year: "2021",
        guesses: [
          { score: 25, username: "player3" },
          { score: 12, username: "player2" },
          { score: 5, username: "player1" }
        ],
        points: [
          { score: 25, username: "player3" },
          { score: 12, username: "player2" },
          { score: 5, username: "player1" }
        ],
        submissions: [
          { score: 25, username: "player3" },
          { score: 12, username: "player2" },
          { score: 5, username: "player1" }
        ],
        fastest: {
          postId: "fastest-post", username: "player4",
          time: 987654, timeString: '16 minutes 27 seconds'
        },
        slowest: {
          postId: "slowest-post", username: "player5",
          time: 12345678910, timeString: '142 days 21 hours 21 minutes 18 seconds'
        },
      } as ScoreboardData)
      expect(redditBot.createPost).toHaveBeenCalledWith('/r/subreddit_name May 2021 Leaderboard', 'rendered-template', true)
    })

    it('does not include fastest speed record if the database did not return it', async () => {
      (mockDatabaseManager.getHighScores as any).mockReturnValue({
        ...mockHighScores,
        fastest: undefined
      })
      await Scoreboards(redditBot as RedditBot, mockDatabaseManager as DatabaseManager).postMonthlyScoreboard();
      expect(mockMustache.render).toHaveBeenCalledWith(expect.anything(), {
        month: "May",
        year: "2021",
        guesses: [
          { score: 25, username: "player3" },
          { score: 12, username: "player2" },
          { score: 5, username: "player1" }
        ],
        points: [
          { score: 25, username: "player3" },
          { score: 12, username: "player2" },
          { score: 5, username: "player1" }
        ],
        submissions: [
          { score: 25, username: "player3" },
          { score: 12, username: "player2" },
          { score: 5, username: "player1" }
        ],
        slowest: {
          postId: "slowest-post", username: "player5",
          time: 12345678910, timeString: '142 days 21 hours 21 minutes 18 seconds'
        }
      } as ScoreboardData)
      expect(redditBot.createPost).toHaveBeenCalledWith('/r/subreddit_name May 2021 Leaderboard', 'rendered-template', true)
    })

    it('does not include slowest speed record if the database did not return it', async () => {
      (mockDatabaseManager.getHighScores as any).mockReturnValue({
        ...mockHighScores,
        slowest: undefined
      })
      await Scoreboards(redditBot as RedditBot, mockDatabaseManager as DatabaseManager).postMonthlyScoreboard();
      expect(mockMustache.render).toHaveBeenCalledWith(expect.anything(), {
        month: "May",
        year: "2021",
        guesses: [
          { score: 25, username: "player3" },
          { score: 12, username: "player2" },
          { score: 5, username: "player1" }
        ],
        points: [
          { score: 25, username: "player3" },
          { score: 12, username: "player2" },
          { score: 5, username: "player1" }
        ],
        submissions: [
          { score: 25, username: "player3" },
          { score: 12, username: "player2" },
          { score: 5, username: "player1" }
        ],
        fastest: {
          postId: "fastest-post", username: "player4",
          time: 987654, timeString: '16 minutes 27 seconds'
        }
      } as ScoreboardData)
      expect(redditBot.createPost).toHaveBeenCalledWith('/r/subreddit_name May 2021 Leaderboard', 'rendered-template', true)
    })

    it('does not post if the database returns missing data', async () => {
      (mockDatabaseManager.getHighScores as any).mockReturnValue({
        scores: [],
        guessers: [{ username: 'player1', score: 5 }],
        submitters: [{ username: 'player1', score: 5 }]
      })
      await Scoreboards(redditBot as RedditBot, mockDatabaseManager as DatabaseManager).postMonthlyScoreboard();
      (mockDatabaseManager.getHighScores as any).mockReturnValue({
        scores: [{ username: 'player1', score: 5 }],
        guessers: [],
        submitters: [{ username: 'player1', score: 5 }]
      });
      await Scoreboards(redditBot as RedditBot, mockDatabaseManager as DatabaseManager).postMonthlyScoreboard();
      (mockDatabaseManager.getHighScores as any).mockReturnValue({
        scores: [{ username: 'player1', score: 5 }],
        guessers: [{ username: 'player1', score: 5 }],
        submitters: [],
      })
      await Scoreboards(redditBot as RedditBot, mockDatabaseManager as DatabaseManager).postMonthlyScoreboard()
      expect(redditBot.createPost).not.toHaveBeenCalled()
    })
  })
})