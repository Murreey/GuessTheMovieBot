import { Submission } from "snoowrap"
import { getConfig } from "./config";
import { RedditBot } from "./RedditBot";
import { Logger } from "./Logger";
import { DatabaseManager as DatabaseManagerType } from "./types";
import DatabaseManager from "./scores/DatabaseManager";

type OptionalTag = 'easy' | 'hard' | 'meta'

export default (bot: RedditBot, db?: DatabaseManagerType) => ({
  processNewSubmission: async (submission: Submission) => {
    const config = getConfig()
    if(!db) db = await DatabaseManager()

    if(await bot.hasReplied(submission)) {
      Logger.debug(`Ignoring ${submission.id} as bot has already replied`)
      return
    }

    const title = submission.title.trim()

    const needsGTMTag = !/^\[?GTM\]?/i.test(title)

    const tags: OptionalTag[] = Object.entries({
      'meta': /\[meta\]/i,
      'easy': /\[easy\]/i,
      'hard': /\[hard\]/i
    })
      .filter(tag => tag[1].test(title))
      .map(tag => tag[0] as OptionalTag)

    if(tags.length > 0) {
      const template = config?.linkFlairTemplates?.[tags?.[0]]
      if (template) {
        Logger.info(`Setting flair on ${submission.permalink} to ${tags?.[0]}`);
        await bot.setPostFlair(submission, template)
      } else {
        Logger.warn(`Could not find valid flair template for '${await submission.id}'!`)
      }
    }

    if(tags.includes('meta')) return

    if(submission.author.name === bot.username) {
      Logger.debug(`Ignoring ${submission.id} as it was posted by the bot`)
      return
    }

    const messageParts = [
      tags.includes('easy') && `This post has been marked **easy**, so is only for new players with **less than 10 points**!`,
      (await db.getUserSubmissionCount(submission.author.name) < 1) && `Welcome to /r/GuessTheMovie, /u/${submission.author.name}! Remember to wait an hour after posting before you start correcting guesses, and reply with 'correct' to the first person who gets it right!\n[Check out the  wiki for more help](https://www.reddit.com/r/${config.subreddit}/wiki/index), and thanks for posting!`,
      needsGTMTag && `/u/${submission.author.name}, please remember to start your post titles with **[GTM]**! It helps people know your screenshot is part of the game in case it pops up out of context on homepage feeds.`
    ].filter(Boolean)

    if(messageParts.length > 0) {
      Logger.info(`Posting bot helper comment on ${submission.permalink}`)
      await bot.reply(submission, messageParts.join(`\n\n***\n\n`), true)
    }
  }
})