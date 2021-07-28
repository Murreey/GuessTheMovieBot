import { RedditBot } from "../RedditBot";
import { Comment } from "snoowrap";
import WinProcessor from "../WinProcessor";
import { Logger } from "../Logger";
import { ScoreManager } from "../types";

export default async (bot: RedditBot, comment: Comment, scoreManager: ScoreManager): Promise<boolean> => {
  if(!await comment.is_submitter) return false
  if(!bot.isCommentAReply(comment)) return false
  const guessComment = (await bot.fetchComment(comment.parent_id))()
  if(guessComment.is_submitter) return false

  const forced = !comment.body?.toLowerCase()?.startsWith('correct')

  Logger.verbose(`A mod approved ${await comment.link_id}, processing win`)
  await WinProcessor(bot, scoreManager)(comment, { forced })
  return true
}