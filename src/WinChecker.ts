import snoowrap from "snoowrap";
import { RedditBot } from "./RedditBot";
import { trimImageURL } from "./GoogleImageSearcher";
import { Logger } from "./Logger";
import { getConfig } from './config'
import { ScoreManager } from "./types";

export default (bot: RedditBot, scoreManager: ScoreManager) => ({
  isValidWin: async (comment: snoowrap.Comment): Promise<boolean> => {
    if(!bot.isCommentAReply(comment)) return false
    if(await bot.hasReplied(comment)) return false

    const guessComment = (await bot.fetchComment(comment.parent_id))()

    if(guessComment.is_submitter) return false

    const config = getConfig()
    if(guessComment.author.name === bot.username) return false

    const submission = bot.fetchPostFromComment(comment)

    if(await submission.is_self) {
      const body = await submission.selftext
      const url = trimImageURL(body)
      if(!url) return false

      Logger.verbose(`'${comment.body}' is a self post but looks like an image URL`)
    }

    const currentFlair: string = await submission.link_flair_template_id
    if(currentFlair) {
      const flairs = config.linkFlairTemplates
      if(Object.values(flairs.identified).includes(currentFlair)) return false

      if(currentFlair === flairs.meta) return false

      if(currentFlair === flairs.easy && await scoreManager.getUserPoints(await guessComment.author.name) >= 10) {
        return false
      }
    }

    // I think this will only be needed for legacy posts, as post flair
    // is 'stamped' once assigned, so changing templates does not affect old posts.
    // Probably safe to keep anyway.
    const currentFlairText: string = (await submission.link_flair_text)
    if(currentFlairText) {
      const flair = currentFlairText.toLowerCase()
      if(flair.includes("identified")) return false
      if(flair.includes("meta")) return false

      if(flair.includes("easy") && await scoreManager.getUserPoints(await guessComment.author.name) >= 10) {
        return false
      }
    }

    return true
  }
})