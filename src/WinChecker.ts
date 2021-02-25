import snoowrap from "snoowrap";
import FlairManager from "./scores/ScoreFlairManager";
import { RedditBot } from "./RedditBot";
import { isImageURL } from "./GoogleImageSearcher";
import { Logger } from "./Logger";

export default (bot: RedditBot) => ({
  isValidWin: async (comment: snoowrap.Comment): Promise<boolean> => {
    if(!bot.isCommentAReply(comment)) return false

    const guessComment = (await bot.fetchComment(comment.parent_id))()

    if(guessComment.is_submitter) return false

    const submission = bot.fetchPostFromComment(comment)

    if(await submission.is_self) {
      const body = await submission.selftext
      const isImageUrl = isImageURL(body)
      if(!isImageUrl) return false

      Logger.verbose(`'${comment.body}' is a self post but looks like an image URL`)
    }

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