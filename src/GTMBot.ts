import { Comment, Submission } from 'snoowrap';
import { RedditBot } from './RedditBot'
import { CommentProcessor } from './CommentProcessor'
 
export class GTMBot {
    bot: RedditBot

    constructor(bot: RedditBot) {
        this.bot = bot
    }

    processComments() {
        this.bot.getReportedComments().forEach((comment) => {
            new CommentProcessor(this.bot).processComment(comment)
        })
    }

    
}