import Undo from '../../src/commands/Undo'

import { Comment } from "snoowrap";
import { getConfig } from "../../src/config"
import { getScores } from "../../src/scores/Scores"
import ScoreManager from "../../src/scores/ScoreManager"

import { mocked } from 'ts-jest/utils'

jest.mock('../../src/config')
jest.mock('../../src/scores/Scores')

describe('Undo', () => {
  const mockScoreManager: any = {
    removeWin: jest.fn()
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
  })

  describe('does not delete the comment or edit scores', () => {
    it('if the comment was not posted by the bot', async () => {
      const comment = mockComment("unknown")
      const result = await Undo(mockRedditBot() as any, comment, mockScoreManager)
      expect(comment.delete).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('if the comment is top level', async () => {
      const bot = mockRedditBot()
      const comment = mockComment()
      bot.isCommentAReply.mockResolvedValue(false)
      const result = await Undo(bot as any, comment, mockScoreManager)
      expect(comment.delete).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('if the post is not identified', async () => {
      const bot = mockRedditBot({ link_flair_template_id: Promise.resolve("unknown-flair") })
      const comment = mockComment()
      const result = await Undo(bot as any, comment, mockScoreManager)
      expect(comment.delete).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })

  it('removes the win from the database', async () => {
    await Undo(mockRedditBot() as any, mockComment(), mockScoreManager)
    expect(mockScoreManager.removeWin).toHaveBeenCalledWith("submission-id")
  })

  it('deletes the bot comment', async () => {
    const comment = mockComment()
    await Undo(mockRedditBot() as any, comment, mockScoreManager)
    expect(comment.delete).toHaveBeenCalled()
  })

  describe('reflairs the post', () => {
    it('removes all flair if the post had no difficulty', async () => {
      const bot = mockRedditBot()
      await Undo(bot as any, mockComment(), mockScoreManager)
      expect(bot.setPostFlair).toHaveBeenCalledWith(expect.anything(), null)
    })

    it('sets the easy flair if the post was easy', async () => {
      const bot = mockRedditBot({ link_flair_template_id: Promise.resolve("easyIdentifiedTemplate") })
      await Undo(bot as any, mockComment(), mockScoreManager)
      expect(bot.setPostFlair).toHaveBeenCalledWith(expect.anything(), "easyTemplate")
    })

    it('sets the hard flair if the post was hard', async () => {
      const bot = mockRedditBot({ link_flair_template_id: Promise.resolve("hardIdentifiedTemplate") })
      await Undo(bot as any, mockComment(), mockScoreManager)
      expect(bot.setPostFlair).toHaveBeenCalledWith(expect.anything(), "hardTemplate")
    })
  })

  it('returns true if everything was successful', () => {
    expect(Undo(mockRedditBot() as any, mockComment(), mockScoreManager)).resolves.toBe(true)
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
    id: "submission-id",
    author: { name: "submitter" },
    link_flair_template_id: Promise.resolve("identifiedTemplate"),
    ...submission
  }),
  setPostFlair: jest.fn(),
  fetchComment: jest.fn()
    .mockResolvedValueOnce(() => ({ parent_id: "parent" }))
    .mockResolvedValueOnce(() => ({ author: { name: "guesser" } }))
})