import processWin from '../src/WinProcessor'

import PointsManager from "../src/PointsManager";

jest.mock('../src/PointsManager')

describe('WinProcessor', () =>  {
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

  describe('sets the correct flair', () => {
    it('when the post has no flair', async () => {
      await processWin(redditBot, mockComment)
      expect(redditBot.setPostFlair).toHaveBeenCalledWith(expect.anything(), "identifiedTemplate")
    })

    it('when the post has `easy` flair', async () => {
      redditBot = mockRedditBot(null, { link_flair_text: Promise.resolve("easy") })
      await processWin(redditBot, mockComment)
      expect(redditBot.setPostFlair).toHaveBeenCalledWith(expect.anything(), "easyIdentifiedTemplate")
    })

    it('when the post has `hard` flair', async () => {
      redditBot = mockRedditBot(null, { link_flair_text: Promise.resolve("hard") })
      await processWin(redditBot, mockComment)
      expect(redditBot.setPostFlair).toHaveBeenCalledWith(expect.anything(), "hardIdentifiedTemplate")
    })
  })

  it('gives players points', async () => {
    await processWin(redditBot, mockComment)
    expect(mockPointsManager.addPoints).toHaveBeenCalledWith("guesser", 6)
    expect(mockPointsManager.addPoints).toHaveBeenCalledWith("submitter", 3)
  })

  it('replies with the correctly formatted reply', async () => {
    await processWin(redditBot, mockComment)
    expect(redditBot.reply).toHaveBeenCalledWith(mockComment, expect.stringContaining("**/u/guesser gets [+6]"))
    expect(redditBot.reply).toHaveBeenCalledWith(mockComment, expect.stringContaining("**/u/submitter gets [+3]"))
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
    id: "submission-id",
    author: {
      name: "submitter"
    },
    link_flair_text: Promise.resolve(null),
    getLinkFlairTemplates: () => ([
      { flair_template_id: "easyTemplate", flair_text: "easy" },
      { flair_template_id: "hardTemplate", flair_text: "hard" },
      { flair_template_id: "identifiedTemplate", flair_text: "identified" },
      { flair_template_id: "easyIdentifiedTemplate", flair_text: "identified + easy" },
      { flair_template_id: "hardIdentifiedTemplate", flair_text: "identified + hard" },
    ]),
    ...submission
  }

  return {
    fetchComment: jest.fn().mockResolvedValue(() => mockGuessComment),
    fetchPostFromComment: jest.fn().mockReturnValue(mockSubmission),
    setPostFlair: jest.fn(),
    reply: jest.fn()
  }
}