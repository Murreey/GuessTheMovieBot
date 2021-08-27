import { Submission } from "snoowrap"
import { getConfig } from "./config";
import { RedditBot } from "./RedditBot";
import { Logger } from "./Logger";

type OptionalTag = 'easy' | 'hard' | 'meta'

export default (bot: RedditBot) => ({
  processNewSubmission: async (submission: Submission) => {
    const config = getConfig()

    if(await bot.hasReplied(submission)) {
      Logger.debug(`Ignoring ${submission.id} as bot has already replied`)
      return
    }

    const title = submission.title.trim()

    const needsGTMTag = !/^\[GTM\]/i.test(title)

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
        Logger.info(`Setting flair on ${submission.permalink}`);
        await bot.setPostFlair(submission, template)
      }
    }

    if(tags.includes('meta')) return

    if(submission.author.name === bot.username) {
      Logger.debug(`Ignoring ${submission.id} as it was posted by the bot`)
      return
    }

    // TODO: if the author has never submitted before, add some tips

    const messageParts = [
      tags.includes('easy') && `This post has been marked **easy**, so is only for new players with **less than 10 points**!`,
      needsGTMTag && `/u/${submission.author.name}, please remember to start your post titles with **[GTM]**! It helps people know your screenshot is part of the game in case it pops up out of context on homepage feeds.`
    ].filter(Boolean)

    if(messageParts.length > 0) {
      Logger.info(`Posting bot helper comment on ${submission.permalink}`)
      await bot.reply(submission, messageParts.join(`\n&nbsp;\n***\n&nbsp;`), true)
    }
  }
})