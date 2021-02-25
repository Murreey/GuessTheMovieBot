import WinChecker from '../src/WinChecker';
import FlairManager from "../src/scores/ScoreFlairManager";

jest.mock('../src/scores/ScoreFlairManager')

describe('WinChecker', () => {
  let redditBot
  let mockFlairManager
  const mockComment: any = {
    parent_id: "parent-id"
  }

  beforeEach(() => {
    redditBot = mockRedditBot({});
    mockFlairManager = {
      getPoints: jest.fn().mockResolvedValue(15),
      addPoints: jest.fn()
    };
    (FlairManager as any).mockReturnValue(mockFlairManager)
  })

  it('rejects any top level comment', async () => {
    redditBot.isCommentAReply.mockReturnValue(false)

    const validWin = await WinChecker(redditBot).isValidWin(mockComment)
    expect(validWin).toBe(false)
  })

  it('rejects if the parent comment was from the OP', async () => {
    redditBot = mockRedditBot({ is_submitter: true })

    const validWin = await WinChecker(redditBot).isValidWin(mockComment)
    expect(validWin).toBe(false)
    expect(redditBot.fetchComment).toHaveBeenCalledWith("parent-id")
  })

  describe('self post', () => {
    it('rejects if the body is not an image URL', async () => {
      redditBot = mockRedditBot(null, { is_self: true, selftext: "Some body text" })

      const validWin = await WinChecker(redditBot).isValidWin(mockComment)
      expect(validWin).toBe(false)
    })

    it('approves if if it is a valid image url', async () => {
      redditBot = mockRedditBot(null, { is_self: true, selftext: "https://images.com/an-image.png" })

      const validWin = await WinChecker(redditBot).isValidWin(mockComment)
      expect(validWin).toBe(true)
    })
    it('approves if it is a valid image url but formatted badly', async () => {
      redditBot = mockRedditBot(null, { is_self: true, selftext: "  https://images.com/an-image.png     " })

      const validWin = await WinChecker(redditBot).isValidWin(mockComment)
      expect(validWin).toBe(true)
    })
  })

  it('rejects if the flair contains `identified`', async () => {
    redditBot = mockRedditBot(null, { link_flair_text: Promise.resolve("identified") })

    const validWin = await WinChecker(redditBot).isValidWin(mockComment)
    expect(validWin).toBe(false)
    expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)
  })

  it('rejects if the flair contains `meta`', async () => {
    redditBot = mockRedditBot(null, { link_flair_text: Promise.resolve("meta") })

    const validWin = await WinChecker(redditBot).isValidWin(mockComment)
    expect(validWin).toBe(false)
    expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)
  })

  it('rejects if the flair contains `easy` and the guesser has >= 10 points', async () => {
    redditBot = mockRedditBot(null, { link_flair_text: Promise.resolve("easy") })

    const validWin = await WinChecker(redditBot).isValidWin(mockComment)
    expect(validWin).toBe(false)
    expect(mockFlairManager.getPoints).toHaveBeenCalledWith("guesser")
    expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)
  })

  it('does not reject if the flair contains `easy` and the guesser has < 10 points', async () => {
    redditBot = mockRedditBot(null, { link_flair_text: Promise.resolve("easy") })
    mockFlairManager.getPoints.mockResolvedValue(5)

    const validWin = await WinChecker(redditBot).isValidWin(mockComment)
    expect(validWin).toBe(true)
    expect(mockFlairManager.getPoints).toHaveBeenCalledWith("guesser")
    expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)
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
    isCommentAReply: jest.fn().mockReturnValue(true),
    fetchComment: jest.fn().mockResolvedValue(() => mockGuessComment),
    fetchPostFromComment: jest.fn().mockReturnValue(mockSubmission),
  }
}