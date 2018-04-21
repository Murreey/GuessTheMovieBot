import * as Bluebird from 'bluebird'
import { Comment, Submission } from 'snoowrap';
import { RedditBot } from './RedditBot'
import { CommentProcessor } from './CommentProcessor'
 
const bot = new RedditBot()

class GTMBot {
    processComments() {
        const commentsToProcess: Comment[] = bot.getReportedComments()
            .filter(comment => comment.link_id === comment.parent_id)
        
        commentsToProcess.forEach((comment) => {
            new CommentProcessor(bot).processComment(comment)
        })
    }

    
}

module.exports = GTMBot