import { CommentProcessor } from './CommentProcessor';
import { Logger } from './Logger';
import { RedditBot } from './RedditBot';

export class GTMBot {
    bot: RedditBot
    config

    constructor(bot: RedditBot, config) {
        this.bot = bot
        this.config = config
    }

    async processComments(logger = Logger.safeLogger(), runOnce = false) {
        const reportedComments = await this.bot.getReportedComments()
        for (let comment of reportedComments) {
            if(this.bot.r.ratelimitRemaining && this.bot.r.ratelimitRemaining < 30) {
                const expiry = this.bot.r.ratelimitExpiration
                if(expiry > Date.now()) {
                    logger.verbose('Approaching rate limit, skipping this check to wait for refresh.')
                    return
                }
            }

            try {
                await new CommentProcessor(this.bot, this.config, logger).processComment(comment)
            } catch (ex) {
                logger.info(`Error processing comment ${comment.link_id}: ${ex}`)
            }

            logger.verbose(`\n`)
            if (runOnce) {
                if(await waitForInput('Process another? (y/n) ') !== 'y') return
            }
        }
    }

}

function waitForInput (text) {
    return new Promise((resolve, reject) => {
      process.stdin.resume()
      process.stdout.write(text)
      process.stdin.once('data', data => resolve(data.toString().trim()))
    })
    .then((result) => {
        process.stdin.pause()
        return result
    })
  }
