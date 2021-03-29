import ForceCorrect from '../../src/commands/ForceCorrect'

// import { getScores } from '../../src/scores/Scores'
// import ScoreManager from '../../src/scores/ScoreManager'
// import  { getSearchUrl } from '../../src/GoogleImageSearcher'
import WinProcessor from '../../src/WinProcessor'

import { mocked } from 'ts-jest/utils'
import { RedditBot, create } from '../../src/RedditBot'
import { Comment } from 'snoowrap'

// jest.mock('../../src/scores/Scores')
// jest.mock('../../src/scores/Scoremanager')
jest.mock('../../src/WinProcessor')

describe('CorrectGIS', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns false if the comment was not from the OP', async () => {
    const comment = mockComment(false)
    const bot = mockRedditBot()
    const result = await ForceCorrect(bot, comment)
    expect(result).toBe(false)
  })

  it('returns false if the comment was not a reply', async () => {
    const comment = mockComment()
    const bot = mockRedditBot()
    bot.isCommentAReply.mockReturnValueOnce(false)
    const result = await ForceCorrect(bot, comment)
    expect(result).toBe(false)
  })

  it('returns false if the comment was not a reply to another user', async () => {
    const comment = mockComment()
    const bot = mockRedditBot(mockComment(true))
    const result = await ForceCorrect(bot, comment)
    expect(result).toBe(false)
  })

  it('sends the comment to the WinProcessor if it is valid', async () => {
    const comment = mockComment()
    const bot = mockRedditBot()
    const result = await ForceCorrect(bot, comment)

    expect(WinProcessor).toHaveBeenCalledWith(bot, comment, { forced: true })
    expect(result).toBe(true)
  })
})


const mockComment = (is_submitter = true) => ({
  is_submitter
} as unknown as Comment)

const mockRedditBot = (confirmationComment = {}, guessComment = {}, submission = {}) => ({
  username: "bot-username",
  readOnly: false,
  isCommentAReply: jest.fn().mockResolvedValue(true),
  fetchPostFromComment: jest.fn().mockResolvedValueOnce({
    id: "post-id",
    author: { name: "submitter" },
    is_self: false,
    url: "https://url",
    ...submission
  }),
  fetchComment: jest.fn()
    .mockResolvedValueOnce(() => confirmationComment)
    .mockResolvedValueOnce(() => ({
      author: { name: "guesser" },
      ...guessComment
    }))
}) as unknown as jest.Mocked<RedditBot>