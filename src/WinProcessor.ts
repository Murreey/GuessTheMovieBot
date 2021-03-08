
import path from 'path'
import { readFileSync, existsSync } from 'fs'
import snoowrap from 'snoowrap';
import Mustache from 'mustache';
import { getConfig } from './config'
import { RedditBot } from './RedditBot';
import { Logger } from './Logger';
import ScoreManager from './scores/ScoreManager';
import { checkGoogleForImage, getSearchUrl } from './GoogleImageSearcher'

export default async (bot: RedditBot, comment: snoowrap.Comment, readOnly = false): Promise<void> => {
  const submission = bot.fetchPostFromComment(comment)
  const guessComment = (await bot.fetchComment(comment.parent_id))()

  Logger.verbose('Updating post flair')
  await updateFlairToIdentified(bot, submission)

  const guesser = await guessComment.author.name
  const submitter = await submission.author.name

  const imageUrl = await submission.is_self ? await submission.selftext : await submission.url
  const foundOnGoogle = await checkGoogleForImage(imageUrl)
  Logger.verbose(`Image was ${foundOnGoogle ? '' : 'not '}found on Google`)

  Logger.debug('Sending win to ScoreManager')
  const points = await ScoreManager(bot).addScore(guesser, submitter, !!foundOnGoogle)

  Logger.verbose(`Posting confirmation comment on ${await submission.id}`)
  bot.reply(comment, createWinComment({
    postID: await submission.id,
    guesser: { name: guesser, points: points.guesser },
    submitter: { name: submitter, points: points.submitter },
    googleUrl: foundOnGoogle ? getSearchUrl(imageUrl) : undefined
  }))
}

const updateFlairToIdentified = async (bot: RedditBot, submission: snoowrap.Submission) => {
  const currentFlair = await submission.link_flair_text
  const config = getConfig()

  const identifiedTemplate = config?.linkFlairTemplates?.identified?.[currentFlair] ?? config?.linkFlairTemplates?.identified?.normal

  if(identifiedTemplate) {
    Logger.debug(`Setting post ${await submission.id} flair to '${identifiedTemplate}'`)
    await bot.setPostFlair(submission, identifiedTemplate)
  } else {
    Logger.warn(`Could not find valid flair template for identifying '${currentFlair}'!`)
  }
}

const createWinComment = (args: {
  postID: string,
  guesser: { name: string, points: number },
  submitter: { name: string, points: number },
  googleUrl: string
}): string => {
  const config = getConfig()
  const templateFile = path.resolve(__dirname, `../templates/${config.replyTemplate}`)
  if(!existsSync(templateFile)) return undefined
  const replyTemplate = readFileSync(templateFile, 'utf-8')
  return Mustache.render(replyTemplate, {...args, subreddit: config.subreddit})
}
