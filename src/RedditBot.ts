import * as snoowrap from 'snoowrap'
import { Listing, Comment, Submission, RedditUser } from 'snoowrap'
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

    async getOPReplies(comment: Comment): Promise<Comment[]> {
        const submitter = await this.getPostFromComment(comment).then(post => post.author.id)
        var replies: Comment[] = await comment.replies.fetchAll()
        
        const repliesWithIDs = await Promise.all(replies.map(async (reply: Comment) => {
            return {
                reply,
                replier: await reply.author.id
            }
        }))

        replies = repliesWithIDs.filter((reply) => reply.replier === submitter)
            .map((reply) => reply.reply)

        return Promise.resolve(replies)
    }

    async getAllRepliers(content: Submission | Comment): Promise<string[]> {
        const repliers: string[] = []

        let replies: Comment[] = []
        if((content as Submission).comments) {
            const postWithReplies: Submission = await content.expandReplies() as Submission
            replies = postWithReplies.comments
        } else {
            replies = (content as Comment).replies
        }

        for(let comment of replies) {
            repliers.push(await comment.author.name)
            repliers.push(... await this.getAllRepliers(comment))
        }

        return Promise.resolve(repliers.filter((elem, index, self) => index === self.indexOf(elem)))
    }

    getCommentFromID(id: string): Promise<Comment> {
        return Promise.resolve(this.r.getComment(id))
    }

    getPostFromComment(comment: Comment): Promise<Submission> {
        return Promise.resolve(this.r.getSubmission(comment.link_id))
    }

    setUserPoints(username: string, points: number) {
        this.r.getUser(username).assignFlair({
            subredditName: this.config['subreddit'],
            text: points
        })
    }

    getUserPoints(username: string): Promise<number> {
        return Promise.resolve(this.r.getSubreddit(this.config['subreddit']))
            .then((subreddit) => subreddit.getUserFlair(username))
            .then(flair => +flair.flair_text)
    }

    getFlairTypes(linkId: string): Promise<FlairTemplate[]> {
        return Promise.resolve(this.r.getSubmission(linkId))
            .then((submission) => submission.getLinkFlairTemplates())
    }

    removeReports(comment: Comment) {
        comment.approve()
    }
}
