import 'mocha'
import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as assert from 'assert'
import * as td from 'testdouble'
import { RedditBot } from '../src/RedditBot'
import { CommentProcessor } from '../src/CommentProcessor'
import { Comment, Submission } from 'snoowrap'
import * as Bluebird from 'bluebird'
import { FlairTemplate } from 'snoowrap/dist/objects/Subreddit';

// chai.use(chaiAsPromised)
// chai.should()

describe('CommentProcessor', () =>{
    describe('checkCommentIsValidWin', () => {
        it('should return true if comment matches criteria', () => {
            const fakeBot = td.object(new RedditBot())
            td.when(fakeBot.getLinkFlair(td.matchers.anything())).thenResolve(null)

            td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([getOPReply(true)])

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, true))
        })

        it('should return false if post already has identified flair', () => {
            const fakeBot = td.object(new RedditBot())
            td.when(fakeBot.getLinkFlair(td.matchers.anything())).thenResolve('identified')

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return false the post is flaired as meta', () => {
            const fakeBot = td.object(new RedditBot())
            const validFlairs = ['easy', 'hard']
            td.when(fakeBot.getLinkFlair(td.matchers.anything())).thenResolve('meta')

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return true if post has a difficulty flair', () => {
            const fakeBot = td.object(new RedditBot())
            const validFlairs = ['easy', 'hard']
            td.when(fakeBot.getLinkFlair(td.matchers.anything())).thenResolve(validFlairs[Math.floor(Math.random() * validFlairs.length)])

            td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([getOPReply()])

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, true))
        })

        it('should return false if it has no replies from OP', () => {
            const fakeBot = td.object(new RedditBot())
            td.when(fakeBot.getLinkFlair(td.matchers.anything())).thenResolve(null)

            td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([])

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return false if it has OP has replied but not with a confirmation', () => {
            const fakeBot = td.object(new RedditBot())
            td.when(fakeBot.getLinkFlair(td.matchers.anything())).thenResolve(null)

            td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([getOPReply(false)])

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return false if comment has multiple replies with no confirmation', () => {
            const fakeBot = td.object(new RedditBot())
            td.when(fakeBot.getLinkFlair(td.matchers.anything())).thenResolve(null)

            td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([getOPReply(false), getOPReply(false)])

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return true if comment has multiple replies with one confirming', () => {
            const fakeBot = td.object(new RedditBot())
            td.when(fakeBot.getLinkFlair(td.matchers.anything())).thenResolve(null)

            td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([getOPReply(false), getOPReply(true), getOPReply(false)])

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, true))
        })

        it('should return false if the reported comment was posted by the OP', () => {
            const fakeBot = td.object(new RedditBot())
            td.when(fakeBot.getLinkFlair(td.matchers.anything())).thenResolve(null)

            const userID = randomString()
            const fakeOPReply = getOPReply(true)
            fakeOPReply.author = { id: userID } as any

            td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([fakeOPReply])

            const fakeComment = getFakeGuessComment(userID)
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })
    })

    describe('commentContainsConfirmation', () => {
        it('should return true if the comment is a valid reply', () => {
            const fakeBot = td.object(new RedditBot())

            const valid = new CommentProcessor(fakeBot).commentContainsConfirmation(getOPReply().body)
            assert.equal(valid, true)
        })

        it('should return false if the comment is an invalid reply', () => {
            const fakeBot = td.object(new RedditBot())

            const valid = new CommentProcessor(fakeBot).commentContainsConfirmation(getOPReply(false).body)
            assert.equal(valid, false)
        })

        it.skip('should return false if the comment contains a valid confirmation, but as part of another word', () => {
            const fakeBot = td.object(new RedditBot())

            const valid = new CommentProcessor(fakeBot).commentContainsConfirmation('No, it is not Eyes Wide Shut.')
            assert.equal(valid, false)
        })
    })

    describe('addIdentifiedFlair', () => {
        it('should set post flair to identified if it has no current flair', () => {
            const fakeBot = td.object(new RedditBot())
            const fakePost = td.object({} as any)
            fakePost.id = randomString()
            fakePost.selectFlair = td.func('selectFlair')

            const flairTypes = getFlairTemplates()
            td.when(fakeBot.getFlairTypes(fakePost.id)).thenResolve(flairTypes)

            const identified_template = flairTypes[0]

            new CommentProcessor(fakeBot).addIdentifiedFlair(fakePost)
                .then(() => td.verify(fakePost.selectFlair(identified_template)))
        })

        it('should set post flair to `identified + easy` if it was an easy submission', () => {
            const fakeBot = td.object(new RedditBot())
            const fakePost = td.object({} as any)
            fakePost.id = randomString()
            fakePost.link_flair_text = 'easy'
            fakePost.selectFlair = td.func('selectFlair')

            const flairTypes = getFlairTemplates()
            td.when(fakeBot.getFlairTypes(fakePost.id)).thenResolve(flairTypes)

            const identified_template = flairTypes[1]

            new CommentProcessor(fakeBot).addIdentifiedFlair(fakePost)
                .then(() => td.verify(fakePost.selectFlair(identified_template)))
        })

        it('should set post flair to `identified + hard` if it was an hard submission', () => {
            const fakeBot = td.object(new RedditBot())
            const fakePost = td.object({} as any)
            fakePost.id = randomString()
            fakePost.link_flair_text = 'hard'
            fakePost.selectFlair = td.func('selectFlair')

            const flairTypes = getFlairTemplates()
            td.when(fakeBot.getFlairTypes(fakePost.id)).thenResolve(flairTypes)

            const identified_template = flairTypes[2]

            new CommentProcessor(fakeBot).addIdentifiedFlair(fakePost)
                .then(() => td.verify(fakePost.selectFlair(identified_template)))
        })
    })

    describe('addPoints', () => {
        it('should set user points to the new total', () => {
            const fakeBot = td.object(new RedditBot())
            const username = randomString()

            const currentPoints = Math.floor(Math.random() * 50)
            const newPoints = Math.ceil((Math.random() + 1) * 3)

            td.when(fakeBot.getUserPoints(username)).thenResolve(currentPoints)

            new CommentProcessor(fakeBot).addPoints(username, newPoints)
                .then(() => {
                    td.verify(fakeBot.setUserPoints(username, currentPoints + newPoints))
                })
        })

        it('should add negative points', () => {
            const fakeBot = td.object(new RedditBot())
            const username = randomString()

            const currentPoints = Math.floor(Math.random() * 50)
            const newPoints = Math.ceil((Math.random() + 1) * 3)

            td.when(fakeBot.getUserPoints(username)).thenResolve(currentPoints)

            new CommentProcessor(fakeBot).addPoints(username, -newPoints)
                .then(() => {
                    td.verify(fakeBot.setUserPoints(username, currentPoints - newPoints))
                })
        })
    })
})

function getOPReply(valid: boolean = true): Comment {
    const fakeOPComment: Comment = td.object({} as any)
    let bodies = ["Yes!", "yes", "That's right, yes", "YES"]
    
    if(!valid) {
        bodies = ["No", "incorrect", "wrong", "No but this film also stars Tommy Wiseau"]
    }

    fakeOPComment.body = bodies[Math.floor(Math.random() * bodies.length)]
    fakeOPComment.author = { id: randomString() } as any
    return fakeOPComment
}

function getFakeGuessComment(userID: string = randomString()): Comment {
    const fakeComment = td.object({} as any)
    fakeComment.author = { id: userID }
    return fakeComment
}

function getFlairTemplates(): FlairTemplate[] {
    const flair = []

    for(let i = 0; i < Math.floor((Math.random() + 5) * 10); i++) {
        flair.push({
            flair_css_class: randomString(),
            flair_template_id: randomString(),
            flair_text_editable: 'true',
            flair_position: 'left',
            flair_text: randomString()
        } as FlairTemplate)
    }

    flair[0].flair_text = 'identified'
    flair[1].flair_text = 'identified + easy'
    flair[2].flair_text = 'identified + hard'

    return flair
}

function randomString(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}