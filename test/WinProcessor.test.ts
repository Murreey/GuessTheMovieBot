import processWin from '../src/WinProcessor'

import fs from 'fs'
import ScoreManager from "../src/scores/ScoreManager";
import { checkGoogleForImage } from "../src/GoogleImageSearcher"
import { getScores } from "../src/scores/Scores"
import { getConfig } from '../src/config'

import { mocked } from 'ts-jest/utils'

jest.mock('../src/scores/ScoreManager')
jest.mock('../src/scores/Scores')
jest.mock('../src/GoogleImageSearcher')
jest.mock('../src/config')

jest.mock('fs')
const mockFs = mocked(fs)

describe('WinProcessor', () =>  {
  let redditBot
  let mockScoreManager
  const mockComment: any = {
    parent_id: "parent-id"
  }

  mockFs.readFileSync.mockReturnValue(`
    * winner **/u/{{ guesser.name }} gets [+{{ guesser.points }}](// "green") points**
    * poster **/u/{{ submitter.name }} gets [+{{ submitter.points }}](// "blue") points**
  `)

  mocked(getConfig).mockReturnValue({
    linkFlairTemplates: {
      identified: {
        normal: "identifiedTemplate",
        easy: "easyIdentifiedTemplate",
        hard: "hardIdentifiedTemplate"
      }
    }
  } as any)

  mocked(getScores).mockReturnValue({ guesser: 8, submitter: 5 })
  const mockGoogleSearcher = mocked(checkGoogleForImage).mockResolvedValue(false)

  beforeEach(() => {
    redditBot = mockRedditBot({});
    mockScoreManager = {
      addScore: jest.fn().mockResolvedValue({ guesser: 8, submitter: 5 }),
    }
    mocked(ScoreManager).mockReturnValue(mockScoreManager)
    mockGoogleSearcher.mockClear()
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

  it('checks the image on google', async () => {
    await processWin(redditBot, mockComment)
    expect(mockGoogleSearcher).toHaveBeenCalledWith("image-url")
  })

  it('searches for the body text if it is a self post', async () => {
    redditBot = mockRedditBot(null, { is_self: true, selftext: "body text" })
    await processWin(redditBot, mockComment)
    expect(mockGoogleSearcher).toHaveBeenCalledWith("body text")
  })

  it('invokes the score manager', async () => {
    await processWin(redditBot, mockComment)
    expect(mockScoreManager.addScore).toHaveBeenCalledWith("guesser", "submitter", false)
  })

  it('invokes the score manager if the image was found on google', async () => {
    mockGoogleSearcher.mockResolvedValue(true)
    await processWin(redditBot, mockComment)
    expect(mockScoreManager.addScore).toHaveBeenCalledWith("guesser", "submitter", true)
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
    url: 'image-url',
    link_flair_text: Promise.resolve(null),
    ...submission
  }

  return {
    fetchComment: jest.fn().mockResolvedValue(() => mockGuessComment),
    fetchPostFromComment: jest.fn().mockReturnValue(mockSubmission),
    setPostFlair: jest.fn(),
    reply: jest.fn()
  }
}