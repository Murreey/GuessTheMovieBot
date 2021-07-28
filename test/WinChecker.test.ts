import WinChecker from '../src/WinChecker';
import { getConfig } from '../src/config'

import { mocked } from 'ts-jest/utils'

jest.mock('../src/config')

describe('WinChecker', () => {
  let redditBot
  let mockScoreManager
  const mockComment: any = {
    parent_id: "parent-id"
  }

  mocked(getConfig).mockReturnValue({
    linkFlairTemplates: {
      easy: "easyTemplate",
      hard: "hardTemplate",
      meta: "metaTemplate",
      identified: {
        normal: "identifiedTemplate",
        easy: "easyIdentifiedTemplate",
        hard: "hardIdentifiedTemplate"
      }
    }
  } as any)

  beforeEach(() => {
    redditBot = mockRedditBot({});
    mockScoreManager = {
      getUserPoints: jest.fn().mockResolvedValue(15),
    }
  })

  it('does not reject a valid win', async () => {
    const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
    expect(validWin).toBe(true)
  })

  it('rejects any top level comment', async () => {
    redditBot.isCommentAReply.mockReturnValue(false)

    const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
    expect(validWin).toBe(false)
  })

  it('rejects if the bot has already replied', async () => {
    redditBot.hasReplied.mockResolvedValue(true)

    const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
    expect(validWin).toBe(false)
  })

  it('rejects if the parent comment was from the OP', async () => {
    redditBot = mockRedditBot({ is_submitter: true })

    const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
    expect(validWin).toBe(false)
    expect(redditBot.fetchComment).toHaveBeenCalledWith("parent-id")
  })

  it('rejects if the parent comment was from the bot', async () => {
    redditBot = mockRedditBot({ author: { name: "bot-username" } })

    const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
    expect(validWin).toBe(false)
  })

  describe('self post', () => {
    it('rejects if the body is not an image URL', async () => {
      redditBot = mockRedditBot(null, { is_self: true, selftext: "Some body text" })

      const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
      expect(validWin).toBe(false)
    })

    it('approves if if it is a valid image url', async () => {
      redditBot = mockRedditBot(null, { is_self: true, selftext: "https://images.com/an-image.png" })

      const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
      expect(validWin).toBe(true)
    })
    it('approves if it is a valid image url but formatted badly', async () => {
      redditBot = mockRedditBot(null, { is_self: true, selftext: "  https://images.com/an-image.png     " })

      const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
      expect(validWin).toBe(true)
    })
  })

  describe('flair templates', () => {
    it('rejects if the flair is any of the identified templates', async () => {
      redditBot = mockRedditBot(null, { link_flair_template_id: Promise.resolve("identifiedTemplate") })

      expect(await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)).toBe(false)
      expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)

      redditBot = mockRedditBot(null, { link_flair_template_id: Promise.resolve("easyIdentifiedTemplate") })

      expect(await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)).toBe(false)
      expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)

      redditBot = mockRedditBot(null, { link_flair_template_id: Promise.resolve("hardIdentifiedTemplate") })

      expect(await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)).toBe(false)
      expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)
    })

    it('rejects if the flair contains `meta`', async () => {
      redditBot = mockRedditBot(null, { link_flair_template_id: Promise.resolve("metaTemplate") })

      const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
      expect(validWin).toBe(false)
      expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)
    })

    it('rejects if the flair is the easy template and the guesser has >= 10 points', async () => {
      redditBot = mockRedditBot(null, { link_flair_template_id: Promise.resolve("easyTemplate") })

      const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
      expect(validWin).toBe(false)
      expect(mockScoreManager.getUserPoints).toHaveBeenCalledWith("guesser")
      expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)
    })

    it('does not reject if the flair is the easy template and the guesser has < 10 points', async () => {
      redditBot = mockRedditBot(null, { link_flair_template_id: Promise.resolve("easyTemplate") })
      mockScoreManager.getUserPoints.mockResolvedValue(5)

      const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
      expect(validWin).toBe(true)
      expect(mockScoreManager.getUserPoints).toHaveBeenCalledWith("guesser")
      expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)
    })
  })

  describe('flair text', () => {
    it('rejects if the flair contains `identified`', async () => {
      redditBot = mockRedditBot(null, { link_flair_text: Promise.resolve("identified") })

      const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
      expect(validWin).toBe(false)
      expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)
    })

    it('rejects if the flair contains `meta`', async () => {
      redditBot = mockRedditBot(null, { link_flair_text: Promise.resolve("meta") })

      const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
      expect(validWin).toBe(false)
      expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)
    })

    it('rejects if the flair contains `easy` and the guesser has >= 10 points', async () => {
      redditBot = mockRedditBot(null, { link_flair_text: Promise.resolve("easy") })

      const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
      expect(validWin).toBe(false)
      expect(mockScoreManager.getUserPoints).toHaveBeenCalledWith("guesser")
      expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)
    })

    it('does not reject if the flair contains `easy` and the guesser has < 10 points', async () => {
      redditBot = mockRedditBot(null, { link_flair_text: Promise.resolve("easy") })
      mockScoreManager.getUserPoints.mockResolvedValue(5)

      const validWin = await WinChecker(redditBot, mockScoreManager).isValidWin(mockComment)
      expect(validWin).toBe(true)
      expect(mockScoreManager.getUserPoints).toHaveBeenCalledWith("guesser")
      expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)
    })
  })
})

const mockRedditBot = (guessComment = {}, submission = {}) => {
  const mockGuessComment = {
    is_submitter: false,
    author: {
      name: "guesser"
    },
    ...guessComment
  }

  const mockSubmission = {
    link_flair_text: Promise.resolve(null),
    ...submission
  }

  return {
    username: 'bot-username',
    isCommentAReply: jest.fn().mockReturnValue(true),
    fetchComment: jest.fn().mockResolvedValue(() => mockGuessComment),
    fetchPostFromComment: jest.fn().mockReturnValue(mockSubmission),
    hasReplied: jest.fn().mockResolvedValue(false)
  }
}