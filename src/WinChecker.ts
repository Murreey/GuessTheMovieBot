import snoowrap from "snoowrap";
import FlairManager from "./scores/ScoreFlairManager";
import { RedditBot } from "./RedditBot";
import { isImageURL } from "./GoogleImageSearcher";
import { Logger } from "./Logger";
import { getConfig } from './config'

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

    const currentFlair: string = await submission.link_flair_template_id
    if(currentFlair) {
      const flairs = getConfig().linkFlairTemplates
      if(Object.values(flairs.identified).includes(currentFlair)) return false

      if(currentFlair === flairs.meta) return false

      if(currentFlair === flairs.easy && await FlairManager(bot).getPoints(await guessComment.author.name) >= 10) {
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

      if(flair.includes("easy") && await FlairManager(bot).getPoints(await guessComment.author.name) >= 10) {
        return false
      }
    }

    return true
  }
})