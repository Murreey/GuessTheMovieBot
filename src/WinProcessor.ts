
import path from 'path'
import { readFileSync } from 'fs'
import snoowrap from 'snoowrap';
import Mustache from 'mustache';
import PointsManager from './PointsManager';
import { loadConfig } from './config'
import { RedditBot } from './RedditBot';
import { Logger } from './Logger';
import ScoreSaver from './ScoreSaver';
import { checkGoogleForImage } from './GoogleImageSearcher'

export default async (bot: RedditBot, comment: snoowrap.Comment): Promise<void> => {
  const submission = bot.fetchPostFromComment(comment)
  const guessComment = (await bot.fetchComment(comment.parent_id))()

  await updateFlairToIdentified(bot, submission)

  const guesser = await guessComment.author.name
  const submitter = await submission.author.name

  const foundOnGoogle = await checkGoogleForImage(await submission.url)

  const pointsManager = PointsManager(bot)
  const guesserTotal = await pointsManager.addPoints(guesser, 6)
  const submitterTotal = await pointsManager.addPoints(submitter, 3)

  const scoreSaver = ScoreSaver()
  scoreSaver.recordGuess(guesser, 6, guesserTotal)
  scoreSaver.recordSubmission(submitter, 3, submitterTotal)

  Logger.verbose(`Posting confirmation comment on ${await submission.id}`)
  bot.reply(comment, createWinComment(await submission.id, submitter, guesser, foundOnGoogle))
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

const createWinComment = (submissionId: string, submitter: string, guesser: string, foundOnGoogle = false): string => {
  const config = loadConfig()
  const replyTemplate = readFileSync(path.resolve(__dirname, `../templates/${config.replyTemplate}`), 'utf-8')

  const templateValues = {
      postID: submissionId,
      guesser,
      guesser_points: 6,
      poster: submitter,
      poster_points: 3,
      subreddit: config.subreddit,
      foundOnGoogle
  }

  return Mustache.render(replyTemplate, templateValues)
}
