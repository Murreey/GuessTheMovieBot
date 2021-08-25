import { RedditBot } from "../RedditBot";
import { Comment, Submission } from "snoowrap";
import { getConfig } from '../config'
import { Logger } from "../Logger";
import { ScoreManager } from "../types";
import ScoreFlairManager from "../scores/ScoreFlairManager";

export default async (bot: RedditBot, comment: Comment, scoreManager: ScoreManager): Promise<boolean> => {
  Logger.debug(`Running Undo command on ${comment.id}`)

  if(comment.author.name !== bot.username) {
    Logger.verbose(`Ignoring Undo as comment was not posted by the bot`)
    return false
  }
  if(!await bot.isCommentAReply(comment)) {
    Logger.verbose(`Ignoring Undo as comment is not a reply`)
    return false
  }

  // @ts-expect-error
  const submission = await bot.fetchPostFromComment(comment)

  const config = getConfig()
  const flairTemplate = await submission.link_flair_template_id
  const isIdentified = Object.values(config.linkFlairTemplates.identified).includes(flairTemplate)
  if(!isIdentified) {
    Logger.debug(`Ignoring Undo as post is not identified`)
    return false
  }

  const correctionComment = (await bot.fetchComment(comment.parent_id))()
  if(!await bot.isCommentAReply(correctionComment)) {
    Logger.debug(`Ignoring Undo as parent comment is not a reply`)
    return false // ?? bot replied to a top level comment ??
  }
  const guessComment = (await bot.fetchComment(correctionComment.parent_id))() // yuck

  if(bot.readOnly) {
    Logger.warn(`Skipping command actions as bot is in read-only mode`)
    return true
  }

  const submitter = await submission.author.name
  const guesser =  guessComment.author.name

  await scoreManager.removeWin(await submission.id)
  const flairManager = ScoreFlairManager(bot, scoreManager)
  await flairManager.syncPoints(guesser)
  await flairManager.syncPoints(submitter)

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