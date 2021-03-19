import Undo from '../../src/commands/Undo'

import { Comment } from "snoowrap";
import { getConfig } from "../../src/config"
import { getScores } from "../../src/scores/Scores"
import ScoreManager from "../../src/scores/ScoreManager"

import { mocked } from 'ts-jest/utils'

jest.mock('../../src/config')
jest.mock('../../src/scores/Scores')
jest.mock('../../src/scores/ScoreManager')

describe('Undo', () => {
  const mockScoreManager = {
    addPoints: jest.fn()
  }
  beforeEach(() => {
    jest.resetAllMocks()

    mocked(getConfig).mockReturnValue({
      linkFlairTemplates: {
        identified: {
          easy: "easyIdentifiedTemplate",
          normal: "identifiedTemplate",
          hard: "hardIdentifiedTemplate"
        },
        easy: "easyTemplate",
        hard: "hardTemplate"
      }
    } as any)
    mocked(getScores).mockReturnValue({
      guesser: 10,
      submitter: 4
    })
    mocked(ScoreManager).mockReturnValue(mockScoreManager as any)
  })

  describe('does not delete the comment or edit scores', () => {
    it('if the comment was not posted by the bot', async () => {
      const comment = mockComment("unknown")
      const result = await Undo(mockRedditBot() as any, comment)
      expect(comment.delete).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('if the comment is top level', async () => {
      const bot = mockRedditBot()
      const comment = mockComment()
      bot.isCommentAReply.mockResolvedValue(false)
      const result = await Undo(bot as any, comment)
      expect(comment.delete).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('if the post is not identified', async () => {
      const bot = mockRedditBot({ link_flair_template_id: Promise.resolve("unknown-flair") })
      const comment = mockComment()
      const result = await Undo(bot as any, comment)
      expect(comment.delete).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })

  describe('gets the right scores', () => {
    it('if the post was not found on google', async () => {
      const bot = mockRedditBot()
      await Undo(bot as any, mockComment())
      expect(getScores).toHaveBeenCalledWith(false)
    })

    it('if the post was found on google', async () => {
      const bot = mockRedditBot()
      const comment = mockComment(undefined, "found on Google Image Search")
      await Undo(bot as any, comment)
      expect(getScores).toHaveBeenCalledWith(true)
    })
  })

  it('removes the right amount of points from user scores', async () => {
    await Undo(mockRedditBot() as any, mockComment())
    expect(mockScoreManager.addPoints).toHaveBeenNthCalledWith(1, "submitter", -4)
    expect(mockScoreManager.addPoints).toHaveBeenNthCalledWith(2, "guesser", -10)
  })

  it('deletes the bot comment', async () => {
    const comment = mockComment()
    await Undo(mockRedditBot() as any, comment)
    expect(comment.delete).toHaveBeenCalled()
  })

  describe('reflairs the post', () => {
    it('removes all flair if the post had no difficulty', async () => {
      const bot = mockRedditBot()
      await Undo(bot as any, mockComment())
      expect(bot.setPostFlair).toHaveBeenCalledWith(expect.anything(), "")
    })

    it('sets the easy flair if the post was easy', async () => {
      const bot = mockRedditBot({ link_flair_template_id: Promise.resolve("easyIdentifiedTemplate") })
      await Undo(bot as any, mockComment())
      expect(bot.setPostFlair).toHaveBeenCalledWith(expect.anything(), "easyTemplate")
    })

    it('sets the hard flair if the post was hard', async () => {
      const bot = mockRedditBot({ link_flair_template_id: Promise.resolve("hardIdentifiedTemplate") })
      await Undo(bot as any, mockComment())
      expect(bot.setPostFlair).toHaveBeenCalledWith(expect.anything(), "hardTemplate")
    })
  })

  it('returns true if everything was successful', () => {
    expect(Undo(mockRedditBot() as any, mockComment())).resolves.toBe(true)
  })
})

const mockComment = (author = "bot-username", body = ""): Comment => ({
  author: { name: author },
  body,
  delete: jest.fn()
} as any)

const mockRedditBot = (submission = {}) => ({
  username: "bot-username",
  readOnly: false,
  isCommentAReply: jest.fn().mockResolvedValue(true),
  fetchPostFromComment: jest.fn().mockResolvedValueOnce({
    author: { name: "submitter" },
    link_flair_template_id: Promise.resolve("identifiedTemplate"),
    ...submission
  }),
  setPostFlair: jest.fn(),
  fetchComment: jest.fn()
    .mockResolvedValueOnce(() => ({ parent_id: "parent" }))
    .mockResolvedValueOnce(() => ({ author: { name: "guesser" } }))
})