import { RedditBot } from "../RedditBot";
import { Comment, Submission } from "snoowrap";
import { getConfig } from '../config'
import { getScores } from "../scores/Scores";
import ScoreManager from "../scores/ScoreManager";
import { Logger } from "../Logger";

export default async (bot: RedditBot, comment: Comment): Promise<boolean> => {
  if(comment.author.name !== bot.username) return false
  if(!await bot.isCommentAReply(comment)) return false

  const submission = (await (bot as any).fetchPostFromComment(comment)) as Submission

  const config = getConfig()
  const flairTemplate = await submission.link_flair_template_id
  const isIdentified = Object.values(config.linkFlairTemplates.identified).includes(flairTemplate)
  if(!isIdentified) return false

  const correctionComment = (await bot.fetchComment(comment.parent_id))()
  if(!await bot.isCommentAReply(correctionComment)) return false // ?? bot replied to a top level comment ??
  const guessComment = (await bot.fetchComment(correctionComment.parent_id))() // yuck

  const submitter = await submission.author.name
  const guesser =  guessComment.author.name
  const previouslyFoundOnGoogle = comment?.body?.toLowerCase().includes("on google image") || false
  const points = getScores(previouslyFoundOnGoogle)

  if(bot.readOnly) {
    Logger.warn(`Skipping command actions as bot is in read-only mode`)
    return true
  }

  const scoreManager = ScoreManager(bot)
  await scoreManager.deductWin(guesser, submitter)
  await scoreManager.addPoints(submitter, -points.submitter)
  await scoreManager.addPoints(guesser, -points.guesser)

  await (comment as any).delete()

  if(flairTemplate === config.linkFlairTemplates.identified.easy) {
    await bot.setPostFlair(submission, config.linkFlairTemplates.easy)
  } else if(flairTemplate === config.linkFlairTemplates.identified.hard) {
    await bot.setPostFlair(submission, config.linkFlairTemplates.hard)
  } else {
    await bot.setPostFlair(submission, null)
  }

  return true
}