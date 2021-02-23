
import path from 'path'
import { readFileSync } from 'fs'
import snoowrap from 'snoowrap';
import Mustache from 'mustache';
import FlairManager from './scores/ScoreFlairManager';
import { getConfig } from './config'
import { RedditBot } from './RedditBot';
import { Logger } from './Logger';
import ScoreFileManager from './scores/ScoreFileManager';
import { checkGoogleForImage } from './GoogleImageSearcher'
import { getScores } from './scores/Scores';

export default async (bot: RedditBot, comment: snoowrap.Comment): Promise<void> => {
  const submission = bot.fetchPostFromComment(comment)
  const guessComment = (await bot.fetchComment(comment.parent_id))()

  Logger.verbose('Updating post flair')
  await updateFlairToIdentified(bot, submission)

  const guesser = await guessComment.author.name
  const submitter = await submission.author.name

  const foundOnGoogle = await checkGoogleForImage(await submission.url)
  Logger.verbose(`Image was ${foundOnGoogle ? 'not ' : ''}found on Google`)

  const scores = getScores(foundOnGoogle)

  const flairManager = FlairManager(bot)
  Logger.verbose('Updating flair points')
  const guesserTotal = await flairManager.addPoints(guesser, scores.guesser)
  const submitterTotal = await flairManager.addPoints(submitter, scores.submitter)

  Logger.verbose('Saving scores to file')
  const scoreFileManager = ScoreFileManager()
  scoreFileManager.recordGuess(guesser, scores.guesser, guesserTotal)
  scoreFileManager.recordSubmission(submitter, scores.submitter, submitterTotal)

  Logger.verbose(`Posting confirmation comment on ${await submission.id}`)
  bot.reply(comment, createWinComment({
    postID: await submission.id,
    guesser: { name: guesser, points: scores.guesser },
    submitter: { name: submitter, points: scores.submitter },
    foundOnGoogle
  }))
}

const updateFlairToIdentified = async (bot: RedditBot, submission: snoowrap.Submission) => {
  const currentFlair = await submission.link_flair_text
  const flairTypes = await submission.getLinkFlairTemplates()

  let newFlair = "identified"
  if(currentFlair === "easy") newFlair += " + easy"
  if(currentFlair === "hard") newFlair += " + hard"

  const flairTemplate = flairTypes.find((template) => newFlair === template.flair_text)
  if(flairTemplate) {
    Logger.verbose(`Setting ${await submission.id} flair to '${newFlair}'`)
    bot.setPostFlair(submission, flairTemplate.flair_template_id)
  } else {
    Logger.warn(`Could not find valid flair template for '${newFlair}'`)
  }
}

const createWinComment = (args: {
  postID: string,
  guesser: { name: string, points: number },
  submitter: { name: string, points: number },
  foundOnGoogle: boolean
}): string => {
  const config = getConfig()
  const replyTemplate = readFileSync(path.resolve(__dirname, `../templates/${config.replyTemplate}`), 'utf-8')

  return Mustache.render(replyTemplate, {...args, subreddit: config.subreddit})
}
