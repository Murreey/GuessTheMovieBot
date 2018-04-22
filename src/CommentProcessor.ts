import { Comment, Submission, ReplyableContent } from 'snoowrap';
import { FlairTemplate } from 'snoowrap/dist/objects/Subreddit';
import { RedditBot } from './RedditBot'
import * as fs from 'fs'
import * as path from 'path'
import * as Mustache from 'mustache'

export class CommentProcessor {
    bot: RedditBot
    guesserComment: Comment
    submitterConfirmationComment: Comment

    constructor(bot) {
        this.bot = bot
    }

    async processComment(comment: Comment) {
        this.guesserComment = comment
        const bodyText = await this.guesserComment.body
        console.log(`processing comment ${bodyText}`)
        if(await this.checkCommentIsValidWin(this.guesserComment)) {
            console.log(`${bodyText} is a valid win!`)
            this.processWin(this.guesserComment)
        }
    }

    async checkCommentIsValidWin(comment: Comment): Promise<boolean> {
        const currentFlair: string = await this.bot.getLinkFlair(await comment.link_id)
        if(currentFlair && (currentFlair.toLowerCase().includes("identified") || currentFlair.toLowerCase().includes("meta"))) {
            return false
        }

        const opReplies = await this.bot.getOPReplies(comment)
        if(opReplies.length === 0) {
            return false
        }

        const opConfirmationComments = opReplies.filter((comment) => this.commentContainsConfirmation(comment.body))
        if(opConfirmationComments.length === 0) {
            return false
        }

        if(await opConfirmationComments[0].author.id === await comment.author.id) {
            return false
        }

        this.submitterConfirmationComment = opConfirmationComments[0]

        return true
    }

    commentContainsConfirmation(comment: string) {
        return comment.toLowerCase().includes("yes")
    }
    
    async processWin(comment: Comment) {
        const winner = await comment.author.name
        const winnerPoints = await this.bot.getUserPoints(comment.author.name)

        const post: Submission = await this.bot.getPostFromComment(comment)
        const submitter = await post.author.name

        this.addIdentifiedFlair(post)

        this.replyWithBotMessage(this.submitterConfirmationComment, comment)

        this.addPoints(winner, 6)
        this.addPoints(submitter, 3)

        this.bot.removeReports(comment)
    }

    async addIdentifiedFlair(post: Submission) {
        const currentFlair = await post.link_flair_text

        const flairTypes: FlairTemplate[] = await this.bot.getFlairTypes(await post.id)

        var newFlair = "identified"
        if(currentFlair === "easy") newFlair = newFlair + " + easy"
        if(currentFlair === "hard") newFlair = newFlair + " + hard"

        const flairTemplate = flairTypes.find((template) => {
            return newFlair === template.flair_text
        })

        if(flairTemplate) {  
            post.selectFlair(flairTemplate)
        }
    }

    async addPoints(username: string, points: number) {
        const currentPoints = await this.bot.getUserPoints(username)
        await this.bot.setUserPoints(username, currentPoints + points)
        console.log(`added ${points} to ${username} - had ${currentPoints}, now has ${currentPoints + points}`)
    }

    async replyWithBotMessage(opComment: Comment, winningComment: Comment) {
        const replyTemplate = fs.readFileSync(path.resolve(__dirname, "../reply_template.md"), "UTF-8")
        const templateValues = {
            guesser: await winningComment.author.name,
            guesser_points: 6,
            poster: await opComment.author.name,
            poster_points: 3,
            subreddit: require('../config.json').subreddit
        }

        const reply = Mustache.render(replyTemplate, templateValues)
        const postedComment: Comment = await opComment.reply(reply) as Comment
        if(postedComment) postedComment.distinguish()
    }
}