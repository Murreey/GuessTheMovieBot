import processWin from '../src/WinProcessor'

import fs from 'fs'
import { checkGoogleForImage } from '../src/GoogleImageSearcher'
import { getScores } from '../src/scores/Scores'
import { getConfig } from '../src/config'

jest.mock('../src/scores/Scores')
jest.mock('../src/GoogleImageSearcher')
jest.mock('../src/config')

jest.mock('fs')
const mockFs = jest.mocked(fs)

describe('WinProcessor', () => {
  let redditBot
  let mockScoreManager
  const mockComment: any = {
    parent_id: 'parent-id'
  }

  mockFs.existsSync.mockReturnValue(true)
  mockFs.readFileSync.mockReturnValue(`
    * winner /u/{{ guesser.name }} gets +{{ guesser.points }} points
    * poster /u/{{ submitter.name }} gets +{{ submitter.points }} points
  `)

  jest.mocked(getConfig).mockReturnValue({
    linkFlairTemplates: {
      identified: {
        normal: 'identifiedTemplate',
        easy: 'easyIdentifiedTemplate',
        hard: 'hardIdentifiedTemplate'
      }
    }
  } as any)

  jest.mocked(getScores).mockReturnValue({ guesser: 8, submitter: 5 })
  const mockGoogleSearcher = jest.mocked(checkGoogleForImage).mockResolvedValue(false)

  beforeEach(() => {
    redditBot = mockRedditBot({})
    mockScoreManager = {
      recordWin: jest.fn().mockResolvedValue({ guesser: 8, submitter: 5 }),
    }
    mockGoogleSearcher.mockClear()
  })

  it('does nothing if any of the content has been deleted', async () => {
    redditBot.isDeleted
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    await processWin(redditBot, mockScoreManager)(mockComment)
    expect(mockScoreManager.recordWin).not.toHaveBeenCalled()
    expect(redditBot.setPostFlair).not.toHaveBeenCalled()
    expect(redditBot.reply).not.toHaveBeenCalled()
  })

  describe('sets the correct flair', () => {
    it('when the post has no flair', async () => {
      await processWin(redditBot, mockScoreManager)(mockComment)
      expect(redditBot.setPostFlair).toHaveBeenCalledWith(expect.anything(), 'identifiedTemplate')
    })

    it('when the post has `easy` flair', async () => {
      redditBot = mockRedditBot(null, { link_flair_text: Promise.resolve('easy') })
      await processWin(redditBot, mockScoreManager)(mockComment)
      expect(redditBot.setPostFlair).toHaveBeenCalledWith(expect.anything(), 'easyIdentifiedTemplate')
    })

    it('when the post has `hard` flair', async () => {
      redditBot = mockRedditBot(null, { link_flair_text: Promise.resolve('hard') })
      await processWin(redditBot, mockScoreManager)(mockComment)
      expect(redditBot.setPostFlair).toHaveBeenCalledWith(expect.anything(), 'hardIdentifiedTemplate')
    })
  })

  it('checks the image on google', async () => {
    await processWin(redditBot, mockScoreManager)(mockComment)
    expect(mockGoogleSearcher).toHaveBeenCalledWith('image-url')
  })

  it('searches for the body text if it is a self post', async () => {
    redditBot = mockRedditBot(null, { is_self: true, selftext: 'body text' })
    await processWin(redditBot, mockScoreManager)(mockComment)
    expect(mockGoogleSearcher).toHaveBeenCalledWith('body text')
  })

  it('invokes the score manager', async () => {
    await processWin(redditBot, mockScoreManager)(mockComment)
    expect(mockScoreManager.recordWin).toHaveBeenCalledWith(redditBot.mockSubmission, redditBot.mockGuessComment, false)
  })

  it('invokes the score manager if the image was found on google', async () => {
    mockGoogleSearcher.mockResolvedValue(true)
    await processWin(redditBot, mockScoreManager)(mockComment)
    expect(mockScoreManager.recordWin).toHaveBeenCalledWith(redditBot.mockSubmission, redditBot.mockGuessComment, true)
  })

  it('replies with the correctly formatted reply', async () => {
    await processWin(redditBot, mockScoreManager)(mockComment)
    expect(redditBot.reply).toHaveBeenCalledWith(mockComment, expect.stringContaining('/u/guesser gets +8'))
    expect(redditBot.reply).toHaveBeenCalledWith(mockComment, expect.stringContaining('/u/submitter gets +5'))
  })

  it('uses custom reply args if provided', async () => {
    await processWin(redditBot, mockScoreManager)(mockComment, { submitter: { name: 'changed', points: 20 }})
    expect(redditBot.reply).toHaveBeenCalledWith(mockComment, expect.stringContaining('/u/guesser gets +8'))
    expect(redditBot.reply).toHaveBeenCalledWith(mockComment, expect.stringContaining('/u/changed gets +20'))
  })
})

const mockRedditBot = (guessComment = {}, submission = {}) => {
  const mockGuessComment = {
    is_submitter: false,
    author: {
      name: 'guesser'
    },
    ...guessComment
  }

  const mockSubmission = {
    id: 'submission-id',
    author: {
      name: 'submitter'
    },
    created_utc: 12345678,
    url: 'image-url',
    link_flair_text: Promise.resolve(null),
    ...submission
  }

  return {
    fetchComment: jest.fn().mockResolvedValue(() => mockGuessComment),
    fetchPostFromComment: jest.fn().mockResolvedValue(mockSubmission),
    setPostFlair: jest.fn(),
    reply: jest.fn(),
    isDeleted: jest.fn().mockResolvedValue(false),
    shortlink: jest.fn(),
    mockGuessComment,
    mockSubmission
  }
}