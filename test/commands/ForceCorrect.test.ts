import ForceCorrect from '../../src/commands/ForceCorrect'

import WinProcessor from '../../src/WinProcessor'

import { RedditBot, create } from '../../src/RedditBot'
import { Comment } from 'snoowrap'

jest.mock('../../src/WinProcessor')

const mockWinProcessor = jest.fn()
jest.mocked(WinProcessor).mockReturnValue(mockWinProcessor)

const mockScoreManager: any = jest.fn()

describe('CorrectGIS', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns false if the comment was not from the OP', async () => {
    const comment = mockComment(false)
    const bot = mockRedditBot()
    const result = await ForceCorrect(bot, comment, mockScoreManager)
    expect(result).toBe(false)
  })

  it('returns false if the comment was not a reply', async () => {
    const comment = mockComment()
    const bot = mockRedditBot()
    bot.isCommentAReply.mockReturnValueOnce(false)
    const result = await ForceCorrect(bot, comment, mockScoreManager)
    expect(result).toBe(false)
  })

  it('returns false if the comment was not a reply to another user', async () => {
    const comment = mockComment()
    const bot = mockRedditBot(mockComment(true))
    const result = await ForceCorrect(bot, comment, mockScoreManager)
    expect(result).toBe(false)
  })

  it('returns false if the bot has already replied to that comment', async () => {
    const comment = mockComment()
    const bot = mockRedditBot(mockComment(true))
    bot.hasReplied.mockResolvedValueOnce(true)
    const result = await ForceCorrect(bot, comment, mockScoreManager)
    expect(result).toBe(false)
  })

  it('sends the comment to the WinProcessor if it is valid', async () => {
    const comment = mockComment()
    const bot = mockRedditBot()
    const result = await ForceCorrect(bot, comment, mockScoreManager)

    expect(WinProcessor).toHaveBeenCalledWith(bot, mockScoreManager)
    expect(mockWinProcessor).toHaveBeenCalledWith(comment, { forced: true })
    expect(result).toBe(true)
  })

  it('does not send the comment as forced if it contained a confirmation', async () => {
    const comment = mockComment(true, 'Correct!')
    const bot = mockRedditBot()
    const result = await ForceCorrect(bot, comment, mockScoreManager)

    expect(WinProcessor).toHaveBeenCalledWith(bot, mockScoreManager)
    expect(mockWinProcessor).toHaveBeenCalledWith(comment, { forced: false })
    expect(result).toBe(true)
  })
})


const mockComment = (is_submitter = true, body?: string) => ({
  is_submitter,
  body
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
  hasReplied: jest.fn().mockResolvedValue(false),
  fetchComment: jest.fn()
    .mockResolvedValueOnce(() => confirmationComment)
    .mockResolvedValueOnce(() => ({
      author: { name: "guesser" },
      ...guessComment
    }))
}) as unknown as jest.Mocked<RedditBot>