// Check post is not already Identified
// Check post submitter is not deleted
// Get comment's parent and check not from OP
// Check comment parent has < 10 if easy
// Run google to check WinType

import snoowrap from "snoowrap";
import FlairManager from "./scores/ScoreFlairManager";
import { RedditBot } from "./RedditBot";

export default (bot: RedditBot) => ({
  isValidWin: async (comment: snoowrap.Comment): Promise<boolean> => {
    if(!bot.isCommentAReply(comment)) return false

    const guessComment = (await bot.fetchComment(comment.parent_id))()

    if(guessComment.is_submitter) return false

    const submission = bot.fetchPostFromComment(comment)
    const currentFlair: string = await submission.link_flair_text
    if(currentFlair) {
      if(currentFlair.toLowerCase().includes("identified")) return false
      if(currentFlair.toLowerCase().includes("meta")) return false

      if(currentFlair.toLowerCase().includes("easy") && await FlairManager(bot).getPoints(await guessComment.author.name) >= 10) {
        return false
      }
    }

    return true
  }
})