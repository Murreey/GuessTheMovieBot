import { Comment, Submission } from 'snoowrap';
import { RedditBot } from './RedditBot'
import { CommentProcessor } from './CommentProcessor'
 
export class GTMBot {
    bot: RedditBot

    constructor(bot: RedditBot) {
        this.bot = bot
    }

    async processComments() {
        const reportedComments = await this.bot.getReportedComments()
        for(let comment of reportedComments){
            new CommentProcessor(this.bot).processComment(comment)
        }
    }

    
}