
import path from 'path'
import { readFileSync } from 'fs'
import snoowrap, { Comment, Submission } from 'snoowrap';
import Mustache from 'mustache';
import PointsManager from './PointsManager';
import { loadConfig } from './config'
import { RedditBot } from './RedditBot';
import { Logger } from './Logger';

export default async (bot: RedditBot, comment: snoowrap.Comment): Promise<void> => {
  const submission = bot.fetchPostFromComment(comment)
  const guessComment = (await bot.fetchComment(comment.parent_id))()

  const guesser = await guessComment.author.name
  const submitter = await submission.author.name

  const currentFlair = await submission.link_flair_text
  const flairTypes = await submission.getLinkFlairTemplates()

  let newFlair = "identified"
  if(currentFlair === "easy") newFlair = newFlair + " + easy"
  if(currentFlair === "hard") newFlair = newFlair + " + hard"

  const flairTemplate = flairTypes.find((template) => newFlair === template.flair_text)
  if(flairTemplate) bot.setFlair(submission, flairTemplate.flair_template_id)

  PointsManager(bot).addPoints(guesser, 6)
  PointsManager(bot).addPoints(submitter, 3)

  bot.reply(comment, getWinComment(await submission.id, submitter, guesser))
}

const getWinComment = (submissionId: string, submitter: string, guesser: string): string => {
  const config = loadConfig()
  const replyTemplate = readFileSync(path.resolve(__dirname, `../templates/${config.replyTemplate}`), 'utf-8')

  const templateValues = {
      postID: submissionId,
      guesser,
      guesser_points: 6,
      poster: submitter,
      poster_points: 3,
      subreddit: config.subreddit
  }

  return Mustache.render(replyTemplate, templateValues)
}
