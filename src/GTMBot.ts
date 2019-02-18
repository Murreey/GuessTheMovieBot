import { CommentProcessor } from './CommentProcessor';
import { Logger } from './Logger';
import { RedditBot } from './RedditBot';

export class GTMBot {
    bot: RedditBot

    constructor(bot: RedditBot) {
        this.bot = bot
    }

    async processComments(logger = Logger.safeLogger()) {
        const reportedComments = await this.bot.getReportedComments()
        for(let comment of reportedComments){
            logger.verbose(`\n`)
            logger.debug(`Dispatching comment '${comment.body}' to processor...`)
            await new CommentProcessor(this.bot, logger).processComment(comment)
        }
    }


}