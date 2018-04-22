import { Comment, Submission } from 'snoowrap';
import { RedditBot } from './RedditBot'
import { CommentProcessor } from './CommentProcessor'
 
export class GTMBot {
    bot: RedditBot

    constructor(bot: RedditBot) {
        this.bot = bot
    }

    processComments() {
        const commentsToProcess: Comment[] = this.bot.getReportedComments()
            .filter(comment => comment.link_id === comment.parent_id)
        
        commentsToProcess.forEach((comment) => {
            new CommentProcessor(this.bot).processComment(comment)
        })
    }

    
}