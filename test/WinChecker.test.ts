import WinChecker from '../src/WinChecker';
import PointsManager from "../src/PointsManager";

jest.mock('../src/PointsManager')

describe('WinChecker', () => {
  let redditBot
  let mockPointsManager
  const mockComment: any = {
    parent_id: "parent-id"
  }

  beforeEach(() => {
    redditBot = mockRedditBot({});
    mockPointsManager = {
      getPoints: jest.fn().mockResolvedValue(15),
      addPoints: jest.fn()
    };
    (PointsManager as any).mockReturnValue(mockPointsManager)
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
    expect(mockPointsManager.getPoints).toHaveBeenCalledWith("guesser")
    expect(redditBot.fetchPostFromComment).toHaveBeenCalledWith(mockComment)
  })

  it('does not reject if the flair contains `easy` and the guesser has < 10 points', async () => {
    redditBot = mockRedditBot(null, { link_flair_text: Promise.resolve("easy") })
    mockPointsManager.getPoints.mockResolvedValue(5)

    const validWin = await WinChecker(redditBot).isValidWin(mockComment)
    expect(validWin).toBe(true)
    expect(mockPointsManager.getPoints).toHaveBeenCalledWith("guesser")
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