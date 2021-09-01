import newPostProcessor from '../src/NewPostProcessor';

import { getConfig } from '../src/config'
import DatabaseManager from '../src/scores/DatabaseManager'
import { mocked } from 'ts-jest/utils'

jest.mock('../src/config')
jest.mock('../src/scores/DatabaseManager')

mocked(getConfig).mockReturnValue({
  subreddit: 'subreddit',
  linkFlairTemplates: {
    meta: 'meta-template',
    easy: 'easy-template',
    hard: 'hard-template'
  }
} as any)

describe('NewPostProcessor', () => {
  let redditBot, mockSubmission, mockDatabaseManager

  beforeEach(() => {
    redditBot = {
      username: 'bot-username',
      reply: jest.fn(),
      hasReplied: jest.fn().mockReturnValue(false),
      setPostFlair: jest.fn()
    }

    mockSubmission = {
      expandReplies: () => ({ comments: [] }),
      author: { name: 'foo' },
      title: '[GTM] correct title'
    }

    mockDatabaseManager = {
      getUserSubmissionCount: jest.fn().mockResolvedValue(5)
    }

    mocked(DatabaseManager).mockResolvedValue(mockDatabaseManager as any)
  })

  it('does not reply if the bot has already replied', async () => {
    redditBot.hasReplied.mockReturnValue(true)
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.setPostFlair).not.toHaveBeenCalled()
    expect(redditBot.reply).not.toHaveBeenCalled()
  })

  it('flairs the post is it has a meta flair', async () => {
    mockSubmission.title = '[meta] post title'

    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.setPostFlair).toHaveBeenCalledWith(mockSubmission, 'meta-template' )
  })

  it('does not reply if the post is tagged meta', async () => {
    mockSubmission.title = '[meta] post title'

    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.reply).not.toHaveBeenCalled()
  })

  it('flairs the post if it has an easy difficilty flair', async () => {
    mockSubmission.title = '[easy] post title'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.setPostFlair).toHaveBeenCalledWith(mockSubmission, 'easy-template' )

    mockSubmission.title = 'post title [easy]'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.setPostFlair).toHaveBeenCalledWith(mockSubmission, 'easy-template' )
  })

  it('flairs the post if it has a hard difficilty flair', async () => {
    mockSubmission.title = '[hard] post title'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.setPostFlair).toHaveBeenCalledWith(mockSubmission, 'hard-template' )

    mockSubmission.title = 'post title [hard]'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.setPostFlair).toHaveBeenCalledWith(mockSubmission, 'hard-template' )
  })

  it('prioritises the right flairs if the title has multiple', async () => {
    mockSubmission.title = '[easy] [hard] [meta] post title'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.setPostFlair).toHaveBeenCalledWith(mockSubmission, 'meta-template' )

    mockSubmission.title = '[hard] post title [easy]'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.setPostFlair).toHaveBeenCalledWith(mockSubmission, 'easy-template' )
  })

  it('does not reply if the bot is the submission author', async () => {
    mockSubmission.author.name = 'bot-username'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.reply).not.toHaveBeenCalled()
  })

  it('does not reply if the post is tagged correctly', async () => {
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.reply).not.toHaveBeenCalled()
  })

  it('allows badly formatted GTM tag', async () => {
    mockSubmission.title = 'GTM post title'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.reply).not.toHaveBeenCalled()
  })

  it('replies if the post is missing the GTM tag', async () => {
    mockSubmission.title = 'post title'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.reply).toHaveBeenCalledWith(mockSubmission, '/u/foo, please remember to start your post titles with **[GTM]**! It helps people know your screenshot is part of the game in case it pops up out of context on homepage feeds.', true)
  })

  it('replies if the post has an easy tag', async () => {
    mockSubmission.title = '[GTM] [easy] post title'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.reply).toHaveBeenCalledWith(mockSubmission, 'This post has been marked **easy**, so is only for new players with **less than 10 points**!', true)
  })

  it('replies if the post has an easy tag and is missing GTM', async () => {
    mockSubmission.title = '[easy] post title'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.reply).toHaveBeenCalledWith(mockSubmission, 'This post has been marked **easy**, so is only for new players with **less than 10 points**!\n\n***\n\n/u/foo, please remember to start your post titles with **[GTM]**! It helps people know your screenshot is part of the game in case it pops up out of context on homepage feeds.', true)
  })

  it('replies if the user has never submitted before', async () => {
    mockDatabaseManager.getUserSubmissionCount.mockResolvedValue(0)
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.reply).toHaveBeenCalledWith(mockSubmission, expect.stringContaining('Welcome'), true)
  })
})