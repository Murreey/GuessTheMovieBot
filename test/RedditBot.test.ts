import 'mocha'
import * as assert from 'assert'
import * as td from 'testdouble'
import { RedditBot } from '../src/RedditBot'
import { CommentProcessor } from '../src/CommentProcessor'
import * as snoowrap from 'snoowrap'
import { Comment, Submission, Listing, RedditUser, Subreddit } from 'snoowrap'
import { FlairTemplate } from 'snoowrap/dist/objects/Subreddit';

describe('RedditBot', () => {
    describe('getOPReplies', () => {
        it('should return an array of all replies to the comment that were posted by the OP', () => {
            const fakeSnoowrap = mockSnoowrap()
            const fakeSubmission: Submission = td.object({} as any)
            td.when(fakeSnoowrap.getSubmission(td.matchers.anything())).thenResolve(fakeSubmission)

            const fakeComment = mockComment()

            const replies = []
            const fakeOP = td.object({} as any)
            fakeOP.id = randomString()
            fakeSubmission.author = fakeOP
            replies.push(mockComment(), mockComment(fakeOP), mockComment())
            td.when(fakeComment.replies.fetchAll()).thenResolve(replies)

            new RedditBot(fakeSnoowrap, false, {}).getOPReplies(fakeComment)
                .then((replies) => {
                    replies.forEach((reply) => {
                        assert.equal(reply.author.id, fakeOP.id)
                    })
                })
        })

        it('should return an empty array if the OP has not replied', () => {
            const fakeSnoowrap = mockSnoowrap()
            const fakeSubmission: Submission = td.object({} as any)
            td.when(fakeSnoowrap.getSubmission(td.matchers.anything())).thenResolve(fakeSubmission)

            const fakeComment = mockComment()

            const replies = []
            const fakeOP = td.object({} as any)
            fakeOP.id = randomString()
            fakeSubmission.author = fakeOP
            replies.push(mockComment(), mockComment(), mockComment())
            td.when(fakeComment.replies.fetchAll()).thenResolve(replies)

            new RedditBot(fakeSnoowrap, false, {}).getOPReplies(fakeComment)
                .then((replies) => assert.equal(replies.length, 0))
        })

        it('should return an empty array if nobody has replied', () => {
            const fakeSnoowrap = mockSnoowrap()
            const fakeSubmission: Submission = td.object({} as any)
            td.when(fakeSnoowrap.getSubmission(td.matchers.anything())).thenResolve(fakeSubmission)

            const fakeComment = mockComment()

            const replies = []
            const fakeOP = td.object({} as any)
            fakeOP.id = randomString()
            fakeSubmission.author = fakeOP
            td.when(fakeComment.replies.fetchAll()).thenResolve(replies)

            new RedditBot(fakeSnoowrap, false, {}).getOPReplies(fakeComment)
                .then((replies) => assert.equal(replies.length, 0))
        })
    })

    describe('getAllRepliers', () => {
        it('should return an array of all usernames who have replied to the post', () => {
            const fakeSnoowrap = mockSnoowrap()
            const fakeSubmission: Submission = td.object({} as any)
            fakeSubmission.expandReplies = td.func('expandReplies') as any
            td.when(fakeSnoowrap.getSubmission(td.matchers.anything())).thenResolve(fakeSubmission)

            const expectedUsernames = []
            const replies = []
            for(let i = 0; i < 10; i++) {
                const comment = mockComment()
                if(Math.round(Math.random()) === 1) {
                    const nestedComment = mockComment()
                    expectedUsernames.push(nestedComment.author.name)
                    comment.replies = [nestedComment] as Listing<Comment>
                }
                expectedUsernames.push(comment.author.name)
                replies.push(comment)
            }
            fakeSubmission.comments = replies as Listing<Comment>
            td.when(fakeSubmission.expandReplies()).thenResolve(fakeSubmission)

            return new RedditBot(fakeSnoowrap, false, {}).getAllRepliers(fakeSubmission)
                .then((repliers) => repliers.forEach((replier) => assert.notEqual(expectedUsernames.indexOf(replier), -1)))
        })

        it('should only return each username once', () => {
            const fakeSnoowrap = mockSnoowrap()
            const fakeSubmission: Submission = td.object({} as any)
            fakeSubmission.expandReplies = td.func('expandReplies') as any
            td.when(fakeSnoowrap.getSubmission(td.matchers.anything())).thenResolve(fakeSubmission)

            const expectedUsernames = []
            const replies = []
            const duplicateName = randomString()
            for(let i = 0; i < 10; i++) {
                const comment = mockComment()
                expectedUsernames.push(comment.author.name)
                replies.push(comment)

                replies.push(mockComment({ author: { name: duplicateName } } as any))
            }

            expectedUsernames.push(duplicateName)
            fakeSubmission.comments = replies as Listing<Comment>
            td.when(fakeSubmission.expandReplies()).thenResolve(fakeSubmission)

            return new RedditBot(fakeSnoowrap, false, {}).getAllRepliers(fakeSubmission)
                .then((repliers) => assert.equal(repliers.length, expectedUsernames.length))
        })
    })

    describe('getUserPoints', () => {
        it('should convert user flair text into a points value', () => {
            const fakeSnoowrap = mockSnoowrap()
            const fakeSubreddit: Subreddit = td.object({} as Subreddit)
            fakeSubreddit.getUserFlair = td.func('getUserFlair') as any
            td.when(fakeSnoowrap.getSubreddit(td.matchers.anything())).thenResolve(fakeSubreddit)

            const username = randomString()
            const points = Math.round(Math.random() * 10)

            td.when(fakeSubreddit.getUserFlair(td.matchers.anything())).thenResolve({
                flair_css_class: randomString(),
                flair_template_id: randomString(),
                flair_text: `${points}`,
                flair_position: 'right'
            })

            return new RedditBot(fakeSnoowrap, false, {}).getUserPoints(username)
                .then((value) => assert.equal (value, points))
        })

        it('should return 0 for players with no flair', () => {
            const fakeSnoowrap = mockSnoowrap()
            const fakeSubreddit: Subreddit = td.object({} as Subreddit)
            fakeSubreddit.getUserFlair = td.func('getUserFlair') as any
            td.when(fakeSnoowrap.getSubreddit(td.matchers.anything())).thenResolve(fakeSubreddit)

            const username = randomString()

            td.when(fakeSubreddit.getUserFlair(td.matchers.anything())).thenResolve({
                flair_css_class: randomString(),
                flair_template_id: randomString(),
                flair_text: null,
                flair_position: 'right'
            })

            return new RedditBot(fakeSnoowrap, false, {}).getUserPoints(username)
                .then((value) => assert.equal (value, 0))
        })
    })
})

 function mockSnoowrap(): snoowrap {
    const fakeSnoowrap: snoowrap = td.object(new snoowrap({
        userAgent: randomString(),
        accessToken: randomString()
    }))

     return fakeSnoowrap
 }

function mockComment(author?: RedditUser): Comment {
    if(!author) {
        author = td.object({} as any)
        author.name = randomString()
        author.id = randomString()
    }

    const comment = td.object({} as any)
    comment.id = randomString()

    comment.author = author

    comment.replies = td.object({} as Listing<Comment>)
    comment.replies.fetchAll = td.func('fetchAll')

    return comment
}

function randomString(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}