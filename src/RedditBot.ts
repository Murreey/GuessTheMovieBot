import * as snoowrap from 'snoowrap';
import { Comment, Submission } from 'snoowrap';
import { FlairTemplate } from 'snoowrap/dist/objects/Subreddit';

export class RedditBot {
    r: snoowrap
    config: Object
    readonly: boolean

    constructor(config, snoowrap?: snoowrap, readonly: boolean = false) {
        this.config = config
        this.r = snoowrap ? snoowrap : this.getNewSnoowrap()
        this.readonly = readonly
    }

    getNewSnoowrap(): snoowrap {
        return new snoowrap({
            userAgent: this.config['userAgent'],
            refreshToken: this.config['refreshToken'],
            clientId: this.config['clientId'],
            clientSecret: this.config['clientSecret']
        })
    }

    async getReportedComments(): Promise<Comment[]> {
        return await this.r
            .getSubreddit(this.config['subreddit'])
            .getReports({ only: "comments" }) as Comment[]
    }

    async getOPReplies(comment: Comment, submission?: Submission): Promise<Comment[]> {
        const submitter = await (submission && submission.author.id || this.getPostFromComment(comment).then(post => post.author.id))
        var replies: Comment[] = await comment.replies.fetchAll()

        const repliesWithIDs = await Promise.all(replies
            .filter((reply: Comment) => !this.isDeleted(reply))
            .map(async (reply: Comment) => {
                const replier = await Promise.resolve(reply.author.id).catch(ex => '[deleted]')
                return {
                        reply,
                        replier
                }
            })
        )

        replies = repliesWithIDs.filter((reply) => reply.replier === submitter)
            .map((reply) => reply.reply)

        return Promise.resolve(replies)
    }

    isDeleted(comment: Comment) {
        return comment.body === "[deleted]" || (comment.author as any) === "[deleted]"
    }

    async getAllRepliers(content: any): Promise<string[]> {
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

    async getParentComment(comment: Comment): Promise<any> {
        return Promise.resolve(this.r.getComment(await comment.parent_id)) as any
    }

    setUserFlair(username: string, points: number, cssClass: string = "") {
        if(!this.readonly) {
            this.r.getUser(username).assignFlair({
                subredditName: this.config['subreddit'],
                text: points,
                cssClass
            })
        }
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
        if(!this.readonly) {
            comment.approve()
        }
    }

    getRateLimitInfo(): string {
        return `Rate Limit: ${this.r.ratelimitRemaining} remaining, expires ${new Date(this.r.ratelimitExpiration)}`
    }

    makePost(post: Post) {
        if(this.readonly) {
            return
        }

        this.r.submitSelfpost({
            subredditName: this.config['subreddit'],
            title: post.title,
            text: post.body,
            sendReplies: false
        }).then(submission => {
            if(post.sticky) submission.sticky({ num: 2 })
        })
    }
}

type Post = {
    title: string
    body: string
    sticky?: boolean
}
