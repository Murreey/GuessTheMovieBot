import snoowrap from "snoowrap";
import { RedditBot } from "./RedditBot";
import { trimImageURL } from "./GoogleImageSearcher";
import { Logger } from "./Logger";
import { getConfig } from './config'
import { ScoreManager } from "./types";

const confirmationFormat = /^[^a-z0-9]*correct/i

export default (bot: RedditBot, scoreManager: ScoreManager) => ({
  isValidWin: async (comment: snoowrap.Comment): Promise<boolean> => {
    if(!comment.is_submitter) return Logger.debug(`Rejected as comment was not by submitter`) && false
    if(!confirmationFormat.test(comment?.body)) return Logger.debug(`Rejected as comment did not match format`) && false
    if(!bot.isCommentAReply(comment)) return Logger.debug(`Rejected as comment was not a reply`) && false
    if(await bot.hasReplied(comment)) return Logger.debug(`Rejected as bot has already replied`) && false

    const guessComment = (await bot.fetchComment(comment.parent_id))()

    if(guessComment.is_submitter) return Logger.debug(`Rejected as parent comment was by submitter`) && false

    const config = getConfig()
    if(guessComment.author.name === bot.username) return Logger.debug(`Rejected as parent comment was from the bot`) && false

    if(await bot.isDeleted(comment) || await bot.isDeleted(guessComment)) {
      Logger.warn(`Could not check win on ${bot.shortlink(comment)}, looks like something was deleted`)
      return false
    }

    //@ts-expect-error
    const submission = await bot.fetchPostFromComment(comment)

    if(await submission.is_self) {
      const body = await submission.selftext
      const url = trimImageURL(body)
      if(!url) return Logger.debug(`Rejected as submission URL could not be parsed`) && false

      Logger.verbose(`'${comment.body}' is a self post but looks like an image URL`)
    }

    const currentFlair: string = await submission.link_flair_template_id
    if(currentFlair) {
      const flairs = config.linkFlairTemplates
      if(Object.values(flairs.identified).includes(currentFlair)) return Logger.debug(`Rejected due to Identified flair`) && false

      if(currentFlair === flairs.meta) return Logger.debug(`Rejected due to Meta flair`) && false

      if(currentFlair === flairs.easy && await scoreManager.getUserPoints(await guessComment.author.name) >= 10) {
        return Logger.debug(`Rejected as guesser has too many points`) && false
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