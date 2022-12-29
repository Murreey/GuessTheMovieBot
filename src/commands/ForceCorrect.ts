import { RedditBot } from '../RedditBot'
import { Comment } from 'snoowrap'
import WinProcessor from '../wins/processor'
import { Logger } from '../Logger'
import { ScoreManager } from '../types'

export default async (bot: RedditBot, comment: Comment, scoreManager: ScoreManager): Promise<boolean> => {
  if (!await comment.is_submitter) {
    Logger.debug('Ignoring ForceCorrect as correction was not by the submitter')
    return false
  }
  if (!bot.isCommentAReply(comment)) {
    Logger.debug('Ignoring ForceCorrect as reported comment is not a reply')
    return false
  }
  const guessComment = (await bot.fetchComment(comment.parent_id))()
  if (guessComment.is_submitter) {
    Logger.debug('Ignoring ForceCorrect as guess was by the submitter')
    return false
  }

  if (await bot.hasReplied(comment)) {
    Logger.debug('Ignoring ForceCorrect as bot has already replied to that comment')
    return false
  }

  const forced = !/^[^a-z0-9]*correct/ig.test(comment?.body)

  Logger.verbose(`A mod approved ${await comment.link_id}, processing win`)
  await WinProcessor(bot, scoreManager)(comment, { forced })
  return true
}