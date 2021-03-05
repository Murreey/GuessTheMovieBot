import newPostProcessor from '../src/NewPostProcessor';

import { getConfig } from '../src/config'
import { mocked } from 'ts-jest/utils'

jest.mock('../src/config')

mocked(getConfig).mockReturnValue({
  bot_username:  'bot-username',
  linkFlairTemplates: {
    easy: 'easy-template',
    hard: 'hard-template'
  }
} as any)

describe('NewPostProcessor', () => {
  let redditBot
  let mockSubmission

  beforeEach(() => {
    redditBot = {
      reply: jest.fn(),
      hasReplied: jest.fn().mockReturnValue(false)
    }

    mockSubmission = {
      expandReplies: () => ({ comments: [] }),
      author: { name: 'foo' },
      selectFlair: jest.fn()
    }
  })

  it('does not reply if the bot has already replied', async () => {
    redditBot.hasReplied.mockReturnValue(true)
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(mockSubmission.selectFlair).not.toHaveBeenCalled()
    expect(redditBot.reply).not.toHaveBeenCalled()
  })

  it('does not reply if the post is tagged meta', async () => {
    mockSubmission.title = '[meta] post title'

    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(mockSubmission.selectFlair).not.toHaveBeenCalled()
    expect(redditBot.reply).not.toHaveBeenCalled()
  })

  it('does not reply if the post is tagged meta', async () => {
    mockSubmission.title = '[meta] post title'

    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(mockSubmission.selectFlair).not.toHaveBeenCalled()
    expect(redditBot.reply).not.toHaveBeenCalled()
  })

  it('flairs the post if it has an easy difficilty flair', async () => {
    mockSubmission.title = '[easy] post title'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(mockSubmission.selectFlair).toHaveBeenCalledWith({ flair_template_id: 'easy-template' })

    mockSubmission.title = 'post title [easy]'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(mockSubmission.selectFlair).toHaveBeenCalledWith({ flair_template_id: 'easy-template' })
  })

  it('flairs the post if it has a hard difficilty flair', async () => {
    mockSubmission.title = '[hard] post title'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(mockSubmission.selectFlair).toHaveBeenCalledWith({ flair_template_id: 'hard-template' })

    mockSubmission.title = 'post title [hard]'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(mockSubmission.selectFlair).toHaveBeenCalledWith({ flair_template_id: 'hard-template' })
  })

  it('does not reply if the bot is the submission author', async () => {
    mockSubmission.author.name = 'bot-username'

    mockSubmission.title = 'post title [easy]'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.reply).not.toHaveBeenCalled()
  })

  it('does not reply if the post is tagged correctly', async () => {
    mockSubmission.title = '[GTM] post title'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.reply).not.toHaveBeenCalled()
  })

  it('replies if the post is missing the GTM tag', async () => {
    mockSubmission.title = 'post title'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.reply).toHaveBeenCalledWith(mockSubmission, '/u/foo, please remember to start your post titles with **[GTM]**! It helps people know your screenshot is part of the game in case it pops up out of context on homepage feeds.')
  })

  it('replies if the post has an easy tag', async () => {
    mockSubmission.title = '[GTM] [easy] post title'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.reply).toHaveBeenCalledWith(mockSubmission, 'This post has been marked **easy**, so is only for new players with less than 10 points!')
  })

  it('replies if the post has an easy tag and is missing GTM', async () => {
    mockSubmission.title = '[easy] post title'
    await newPostProcessor(redditBot).processNewSubmission(mockSubmission)
    expect(redditBot.reply).toHaveBeenCalledWith(mockSubmission, 'This post has been marked **easy**, so is only for new players with less than 10 points!\n&nbsp;\n***\n&nbsp;/u/foo, please remember to start your post titles with **[GTM]**! It helps people know your screenshot is part of the game in case it pops up out of context on homepage feeds.')
  })
})