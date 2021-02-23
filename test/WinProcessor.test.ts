import processWin from '../src/WinProcessor'

import FlairManager from "../src/scores/ScoreFlairManager";
import ScoreFileManager from "../src/scores/ScoreFileManager";
import { checkGoogleForImage } from "../src/GoogleImageSearcher"
import { getScores } from "../src/scores/Scores"

import { mocked } from 'ts-jest/utils'

jest.mock('../src/scores/ScoreFlairManager')
jest.mock('../src/scores/ScoreFileManager')
jest.mock('../src/scores/Scores')
jest.mock('../src/GoogleImageSearcher')

describe('WinProcessor', () =>  {
  let redditBot
  let mockFlairManager, mockScoreFileManager
  const mockComment: any = {
    parent_id: "parent-id"
  }

  mocked(checkGoogleForImage).mockResolvedValue(false)
  mocked(getScores).mockReturnValue({ guesser: 8, submitter: 5 })

  beforeEach(() => {
    redditBot = mockRedditBot({});
    mockFlairManager = {
      getPoints: jest.fn().mockResolvedValue(15),
      addPoints: jest.fn().mockResolvedValueOnce(12).mockResolvedValueOnce(30)
    };
    (FlairManager as any).mockReturnValue(mockFlairManager)
    mockScoreFileManager = { recordGuess: jest.fn(), recordSubmission: jest.fn() };
    (ScoreFileManager as any).mockReturnValue(mockScoreFileManager)
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
    expect(mockFlairManager.addPoints).toHaveBeenCalledWith("guesser", 8)
    expect(mockFlairManager.addPoints).toHaveBeenCalledWith("submitter", 5)
  })

  it('saves players scores to file', async () => {
    await processWin(redditBot, mockComment)
    expect(mockScoreFileManager.recordGuess).toHaveBeenCalledWith("guesser", 8, 12)
    expect(mockScoreFileManager.recordSubmission).toHaveBeenCalledWith("submitter", 5, 30)
  })

  it('replies with the correctly formatted reply', async () => {
    await processWin(redditBot, mockComment)
    expect(redditBot.reply).toHaveBeenCalledWith(mockComment, expect.stringContaining("**/u/guesser gets [+8]"))
    expect(redditBot.reply).toHaveBeenCalledWith(mockComment, expect.stringContaining("**/u/submitter gets [+5]"))
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