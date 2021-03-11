import { Submission } from "snoowrap"
import { getConfig } from "./config";
import { RedditBot } from "./RedditBot";
import { Logger } from "./Logger";

export default (bot: RedditBot) => ({
  processNewSubmission: async (submission: Submission) => {
    const config = getConfig()

    if(await bot.hasReplied(submission)) {
      Logger.debug(`Ignoring ${submission.id} as bot has already replied`)
      return
    }

    const title = submission.title.trim()

    const needsGTMTag = !/^\[GTM\]/i.test(title)
    const hasMetaTag = /^\[meta\]/i.test(title)
    const hasEasyTag = /\[easy\]/i.test(title)
    const hasHardTag = /\[hard\]/i.test(title)

    // TODO: if the author has never submitted before, add some tips

    if(hasMetaTag) return // TODO meta flair

    if(hasEasyTag || hasHardTag) {
      const template = config.linkFlairTemplates?.[hasEasyTag ? 'easy' : 'hard']
      if (template) {
        Logger.info(`Setting flair on ${submission.permalink}`);
        (await (submission as any)).selectFlair({ flair_template_id: template })
      }
    }

    if(submission.author.name === bot.username) {
      return
    }

    const messageParts = [
      hasEasyTag && `This post has been marked **easy**, so is only for new players with less than 10 points!`,
      needsGTMTag && `/u/${submission.author.name}, please remember to start your post titles with **[GTM]**! It helps people know your screenshot is part of the game in case it pops up out of context on homepage feeds.`
    ].filter(Boolean)

    if(messageParts.length > 0) {
      Logger.info(`Posting bot helper comment on ${submission.permalink}`)
      await bot.reply(submission, messageParts.join(`\n&nbsp;\n***\n&nbsp;`))
    }
  }
})