import path from 'path'
import { readFileSync, existsSync } from 'fs'
import snoowrap from 'snoowrap'
import Mustache from 'mustache'
import { getConfig } from './config'
import { RedditBot } from './RedditBot'
import { Logger } from './Logger'
import { checkGoogleForImage, getSearchUrl } from './GoogleImageSearcher'
import { ScoreManager, WinComment } from './types'

export default (bot: RedditBot, scoreManager: ScoreManager) => async (comment: snoowrap.Comment, winCommentArgs: Partial<WinComment> = {}): Promise<void> => {
  //@ts-expect-error
  const submission = await bot.fetchPostFromComment(comment)
  const guessComment = (await bot.fetchComment(comment.parent_id))()

  if (await bot.isDeleted(submission) || await bot.isDeleted(comment) || await bot.isDeleted(guessComment)) {
    Logger.warn(`Can't process win - looks like something was deleted. ${bot.shortlink(submission)}`)
    return
  }

  Logger.verbose('Updating post flair')
  await updateFlairToIdentified(bot, submission)

  const guesser = await guessComment.author.name
  const submitter = await submission.author.name

  const imageUrl = await submission.is_self ? await submission.selftext : await submission.url
  const foundOnGoogle = await checkGoogleForImage(imageUrl)
  Logger.verbose(`Image was ${foundOnGoogle ? '' : 'not '}found on Google`)

  Logger.debug('Sending win to ScoreManager')
  const points = await scoreManager.recordWin(submission, guessComment, !!foundOnGoogle)

  Logger.info(`Posting confirmation comment on ${bot.shortlink(submission)}`)
  bot.reply(comment, createWinComment({
    postID: await submission.id,
    guesser: { name: guesser, points: points.guesser },
    submitter: { name: submitter, points: points.submitter },
    googleUrl: foundOnGoogle ? getSearchUrl(imageUrl) : undefined,
    ...winCommentArgs
  }))
}

const updateFlairToIdentified = async (bot: RedditBot, submission: snoowrap.Submission) => {
  const currentFlair = await submission.link_flair_text
  const config = getConfig()

  const identifiedTemplate = config?.linkFlairTemplates?.identified?.[currentFlair as ('easy' | 'hard')] ?? config?.linkFlairTemplates?.identified?.normal

  if (identifiedTemplate) {
    Logger.debug(`Setting post ${await submission.id} flair to '${identifiedTemplate}'`)
    await bot.setPostFlair(submission, identifiedTemplate)
  } else {
    Logger.warn(`Could not find valid flair template for identifying ${bot.shortlink(submission)}!`)
  }
}

export const createWinComment = (args: WinComment): string => {
  const config = getConfig()
  const templateFile = path.resolve(__dirname, `../templates/${config.replyTemplate}`)
  if (!existsSync(templateFile)) return undefined
  const replyTemplate = readFileSync(templateFile, 'utf-8')
  return Mustache.render(replyTemplate, {...args, subreddit: config.subreddit})
}
