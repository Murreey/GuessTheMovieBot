import { RedditBot } from "../RedditBot";
import { Comment, Submission } from "snoowrap";
import { Logger } from "../Logger";
import { getScores } from "../scores/Scores";
import ScoreManager from "../scores/ScoreManager";
import { createWinComment } from "../WinProcessor";
import { getSearchUrl } from "../GoogleImageSearcher";

export default async (bot: RedditBot, comment: Comment): Promise<boolean> => {
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

  const originalPoints = getScores(previouslyFoundOnGoogle)
  const newPoints = getScores(!previouslyFoundOnGoogle)
  const pointChange = {
    submitter: newPoints.submitter - originalPoints.submitter,
    guesser: newPoints.guesser - originalPoints.guesser
  }

  if(bot.readOnly) {
    Logger.warn(`Skipping command actions as bot is in read-only mode`)
    return true
  }

  const scoreManager = ScoreManager(bot)
  await scoreManager.addPoints(submitter, pointChange.submitter)
  await scoreManager.addPoints(guesser, pointChange.guesser)

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