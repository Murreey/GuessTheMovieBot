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

    async processComments(logger = Logger.safeLogger()) {
        const reportedComments = await this.bot.getReportedComments()
        for(let comment of reportedComments){
            logger.verbose(`\n`)
            logger.debug(`Dispatching comment '${comment.body}' to processor...`)
            await new CommentProcessor(this.bot, this.config, logger).processComment(comment)
        }
    }


}