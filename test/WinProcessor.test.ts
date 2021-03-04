import processWin from '../src/WinProcessor'

import fs from 'fs'
import FlairManager from "../src/scores/ScoreFlairManager";
import * as fileManager from "../src/scores/ScoreFileManager";
import { checkGoogleForImage } from "../src/GoogleImageSearcher"
import { getScores } from "../src/scores/Scores"
import { getConfig } from '../src/config'

import { mocked } from 'ts-jest/utils'

jest.mock('../src/scores/ScoreFlairManager')
jest.mock('../src/scores/ScoreFileManager')
jest.mock('../src/scores/Scores')
jest.mock('../src/GoogleImageSearcher')
jest.mock('../src/config')

jest.mock('fs')
const mockFs = mocked(fs)

describe('WinProcessor', () =>  {
  let redditBot
  let mockFlairManager
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
  const mockFileManager = mocked(fileManager)

  beforeEach(() => {
    redditBot = mockRedditBot({});
    mockFlairManager = {
      getPoints: jest.fn().mockResolvedValue(15),
      addPoints: jest.fn().mockResolvedValueOnce(12).mockResolvedValueOnce(30)
    };
    (FlairManager as any).mockReturnValue(mockFlairManager)
    mockFileManager.recordGuess.mockClear()
    mockFileManager.recordSubmission.mockClear()
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

  it('gives players points', async () => {
    await processWin(redditBot, mockComment)
    expect(mockFlairManager.addPoints).toHaveBeenCalledWith("guesser", 8)
    expect(mockFlairManager.addPoints).toHaveBeenCalledWith("submitter", 5)
  })

  it('saves players scores to file', async () => {
    await processWin(redditBot, mockComment)
    expect(mockFileManager.recordGuess).toHaveBeenCalledWith("guesser", 8, 12)
    expect(mockFileManager.recordSubmission).toHaveBeenCalledWith("submitter", 5, 30)
  })

  it('does not saves players scores to file if read only mode is enabled', async () => {
    await processWin(redditBot, mockComment, true)
    expect(mockFileManager.recordGuess).not.toHaveBeenCalled()
    expect(mockFileManager.recordSubmission).not.toHaveBeenCalled()
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