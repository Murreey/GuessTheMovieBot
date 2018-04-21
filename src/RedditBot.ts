import * as snoowrap from 'snoowrap'
import * as Bluebird from 'bluebird'
import { Listing, Comment, Submission } from 'snoowrap'
import { FlairTemplate } from 'snoowrap/dist/objects/Subreddit';

export class RedditBot {
    r: snoowrap
    config: Object

    constructor(snoowrap?: snoowrap) {
        this.config = require('../config.json')
        if(snoowrap) {
            this.r = snoowrap
        } else {
            this.r = this.getNewSnoowrap()
        }
    }

    getNewSnoowrap(): snoowrap {
        return new snoowrap({
            userAgent: this.config['userAgent'],
            refreshToken: this.config['refreshToken'],
            clientId: this.config['clientId'],
            clientSecret: this.config['clientSecret']
        })
    }

    getReportedComments(): Comment[] {
        return this.r
            .getSubreddit(this.config['subreddit'])
            .getReports({ only: "comments" }) as Comment[]
    }

    async getOPReplies(comment: Comment): Bluebird<Comment[]> {
        const submitter = await this.getPostFromComment(comment).then(post => post.author.id)
        var replies: Comment[] = await comment.replies.fetchAll()
        
        const repliesWithIDs = await Bluebird.resolve(replies)
            .map(async (reply: Comment) => {
                return {
                    reply,
                    replier: await reply.author.id
                }
            })


        replies = repliesWithIDs.filter((reply) => reply.replier === submitter)
            .map((reply) => reply.reply)

        return Bluebird.resolve(replies)
    }

    getCommentFromID(id: string): Bluebird<Comment> {
        return Bluebird.resolve(this.r.getComment(id))
    }

    getPostFromComment(comment: Comment): Bluebird<Submission> {
        return Bluebird.resolve(this.r.getSubmission(comment.parent_id))
    }

    setUserPoints(username: string, points: number) {
        this.r.getUser(username).assignFlair({
            subredditName: this.config['subreddit'],
            text: points
        })
    }

    getUserPoints(username: string): Bluebird<number> {
        return Bluebird.resolve(this.r.getSubreddit(this.config['subreddit']))
            .then((subreddit) => subreddit.getUserFlair(username))
            .then(flair => +flair.flair_text)
    }

    getFlairTypes(linkId: string): Bluebird<FlairTemplate[]> {
        return Bluebird.resolve(this.r.getSubmission(linkId))
            .then((submission) => submission.getLinkFlairTemplates())
    }

    getLinkFlair(linkId: string): Bluebird<string> {
        return Bluebird.resolve(this.r.getSubmission(linkId))
            .then((submission) => submission.link_flair_text)
    }

    removeReports(comment: Comment) {
        comment.approve()
    }
}
