import { RedditBot } from "../RedditBot";
import { Comment, Submission } from "snoowrap";
import { Logger } from "../Logger";
import { createWinComment } from "../WinProcessor";
import { getSearchUrl } from "../GoogleImageSearcher";
import { ScoreManager } from "../types";
import ScoreFlairManager from "../scores/ScoreFlairManager";

export default async (bot: RedditBot, comment: Comment, scoreManager: ScoreManager): Promise<boolean> => {
  if(comment.author.name !== bot.username) return false
  if(!await bot.isCommentAReply(comment)) return false
  const previouslyFoundOnGoogle = comment?.body?.toLowerCase().includes("found on google") || false
  Logger.verbose(`Post was originally ${previouslyFoundOnGoogle ? '' : 'not '}found on Google, ${previouslyFoundOnGoogle ? 'increasing' : 'reducing'} points`)

  const correctionComment = (await bot.fetchComment(comment.parent_id))()
  if(!await bot.isCommentAReply(correctionComment)) return false // ?? bot replied to a top level comment ??
  const guessComment = (await bot.fetchComment(correctionComment.parent_id))() // yuck

  const submission = (await (bot as any).fetchPostFromComment(comment)) as Submission
  const submitter = await submission.author.name
  const guesser =  guessComment.author.name

  if(bot.readOnly) {
    Logger.warn(`Skipping command actions as bot is in read-only mode`)
    return true
  }

  const newPoints = await scoreManager.updatePoints(await submission.id, !previouslyFoundOnGoogle)

  const flairManager = ScoreFlairManager(bot, scoreManager)
  await flairManager.syncPoints(guesser)
  await flairManager.syncPoints(submitter)

  const imageUrl = await submission.is_self ? await submission.selftext : await submission.url
  Logger.verbose('Editing bot comment for GIS adjustment')
  await (comment as any).edit(
    createWinComment({
      postID: await submission.id,
      guesser: { name: guesser, points: newPoints.guesser },
      submitter: { name: submitter, points: newPoints.submitter },
      googleUrl: previouslyFoundOnGoogle ? undefined : getSearchUrl(imageUrl)
    })
  )

  return true
}