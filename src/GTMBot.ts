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
            logger.verbose(this.bot.getRateLimitInfo())
            const result = await new CommentProcessor(this.bot, this.config, logger).processComment(comment)
            logger.verbose(this.bot.getRateLimitInfo())

            result ? logger.info(`\n`) : logger.verbose(`\n`)
            if (runOnce) return;
        }
    }


}