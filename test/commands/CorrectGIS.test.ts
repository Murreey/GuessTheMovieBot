import CorrectGIS from '../../src/commands/CorrectGIS'

import { getScores } from '../../src/scores/Scores'
import ScoreManager from '../../src/scores/ScoreManager'
import  { createWinComment } from '../../src/WinProcessor'
import  { getSearchUrl } from '../../src/GoogleImageSearcher'

import { mocked } from 'ts-jest/utils'
import { Comment } from 'snoowrap'

jest.mock('../../src/scores/Scores')
jest.mock('../../src/scores/Scoremanager')
jest.mock('../../src/WinProcessor')
jest.mock('../../src/GoogleImageSearcher')

const mockScoreManager = {
  addPoints: jest.fn()
}

describe('CorrectGIS', () => {
  beforeEach(() => {
    mocked(getScores).mockImplementation(found => found
      ? ({ submitter: 3, guesser: 6 })
      : ({ submitter: 15, guesser: 10 })
    )
    mocked(ScoreManager).mockReturnValue(mockScoreManager as any)
    mocked(createWinComment).mockReturnValue("new comment body")
    mocked(getSearchUrl).mockReturnValue("https://google")
  });

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('does not edit the comment or scores', () => {
    it('if the comment was not posted by the bot', async () => {
      const comment = mockComment("unknown")
      const result = await CorrectGIS(mockRedditBot() as any, comment)
      expect(mockScoreManager.addPoints).not.toHaveBeenCalled()
      expect(comment.edit).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('if the comment is top level', async () => {
      const bot = mockRedditBot()
      const comment = mockComment()
      bot.isCommentAReply.mockResolvedValue(false)
      const result = await CorrectGIS(bot as any, comment)
      expect(mockScoreManager.addPoints).not.toHaveBeenCalled()
      expect(comment.edit).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('if the correction comment is top level', async () => {
      const bot = mockRedditBot()
      const comment = mockComment()
      bot.isCommentAReply.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
      const result = await CorrectGIS(bot as any, comment)
      expect(mockScoreManager.addPoints).not.toHaveBeenCalled()
      expect(comment.edit).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('if the bot is in read only mode', async () => {
      const bot = mockRedditBot()
      bot.readOnly = true
      const comment = mockComment()
      const result = await CorrectGIS(bot as any, comment)
      expect(mockScoreManager.addPoints).not.toHaveBeenCalled()
      expect(comment.edit).not.toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })

  describe('when post was previously found on google', () => {
    it('sends score corrections to the score manager', async () => {
      const comment = mockComment(undefined, "this post was found on google")
      const result = await CorrectGIS(mockRedditBot() as any, comment)
      expect(getScores).toHaveBeenNthCalledWith(1, true)
      expect(getScores).toHaveBeenNthCalledWith(2, false)
      expect(mockScoreManager.addPoints).toHaveBeenNthCalledWith(1, "submitter", 12)
      expect(mockScoreManager.addPoints).toHaveBeenNthCalledWith(2, "guesser", 4)
      expect(result).toBe(true)
    })

    it('edits the bot reply comment', async () => {
      const comment = mockComment(undefined, "this post was found on google")
      const result = await CorrectGIS(mockRedditBot() as any, comment)
      expect(mocked(createWinComment)).toHaveBeenCalledWith({
        postID: "post-id",
        guesser: { name: "guesser", points: 10 },
        submitter: { name: "submitter", points: 15 },
        googleUrl: undefined
      })
      expect(comment.edit).toHaveBeenCalledWith("new comment body")
      expect(result).toBe(true)
    })
  })

  describe('when post was not previously found on google', () => {
    it('sends score corrections to the score manager', async () => {
      const comment = mockComment(undefined, "win confirmed")
      const result = await CorrectGIS(mockRedditBot() as any, comment)
      expect(getScores).toHaveBeenNthCalledWith(1, false)
      expect(getScores).toHaveBeenNthCalledWith(2, true)
      expect(mockScoreManager.addPoints).toHaveBeenNthCalledWith(1, "submitter", -12)
      expect(mockScoreManager.addPoints).toHaveBeenNthCalledWith(2, "guesser", -4)
      expect(result).toBe(true)
    })

    it('edits the bot reply comment', async () => {
      const comment = mockComment(undefined, "win confirmed")
      const result = await CorrectGIS(mockRedditBot() as any, comment)
      expect(mocked(getSearchUrl)).toHaveBeenCalledWith("https://url")
      expect(mocked(createWinComment)).toHaveBeenCalledWith({
        postID: "post-id",
        guesser: { name: "guesser", points: 6 },
        submitter: { name: "submitter", points: 3 },
        googleUrl: "https://google"
      })
      expect(comment.edit).toHaveBeenCalledWith("new comment body")
      expect(result).toBe(true)
    })
  })
})

const mockComment = (author = "bot-username", body = ""): Comment => ({
  author: { name: author },
  body,
  edit: jest.fn()
} as any)

const mockRedditBot = (confirmationComment = {}, guessComment = {}, submission = {}) => mocked({
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
      author: { name: "guesser" } ,
      ...guessComment
    }))
})