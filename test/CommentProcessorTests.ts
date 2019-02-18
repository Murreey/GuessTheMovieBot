import 'mocha'
import * as assert from 'assert'
import * as td from 'testdouble'
import { RedditBot } from '../src/RedditBot'
import { CommentProcessor } from '../src/CommentProcessor'
import { Comment, Submission, RedditUser } from 'snoowrap'
import { FlairTemplate } from 'snoowrap/dist/objects/Subreddit'
import * as fs from 'fs'
import * as path from 'path'
import * as Mustache from 'mustache'

describe('CommentProcessor', () => {
    describe('checkCommentIsValidWin', () => {
        it('should return true if comment matches criteria', () => {
            const fakeBot = getFakeBot()
            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, true))
        })

        it('should return false if the post is a self post', () => {
            const fakeSubmission = getFakeSubmission()
            fakeSubmission.is_self = true
            const fakeBot = getFakeBot(fakeSubmission)

            td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([getOPReply()])

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return false if post already has identified flair', () => {
            const fakeSubmission = getFakeSubmission('identified')
            const fakeBot = getFakeBot(fakeSubmission)

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return false if post is flaired as meta', () => {
            const fakeSubmission = getFakeSubmission('meta')
            const fakeBot = getFakeBot(fakeSubmission)

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return true if post has a difficulty flair', () => {
            const validFlairs = ['easy', 'hard']
            const fakeSubmission = getFakeSubmission(validFlairs[Math.floor(Math.random() * validFlairs.length)])
            const fakeBot = getFakeBot(fakeSubmission)

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, true))
        })

        it('should return false if it has no replies from OP', () => {
            const fakeBot = getFakeBot()
            td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([])

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return false if it has OP has replied but not with a confirmation', () => {
            const fakeBot = getFakeBot()

            td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([getOPReply(false)])

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return false if comment has multiple replies with no confirmation', () => {
            const fakeBot = getFakeBot()

            td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([getOPReply(false), getOPReply(false)])

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return true if comment has multiple replies with one confirming', () => {
            const fakeBot = getFakeBot()

            td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([getOPReply(false), getOPReply(true), getOPReply(false)])

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, true))
        })

        it('should return false if the reported comment was posted by the OP', () => {
            const fakeBot = getFakeBot()

            const userID = randomString()
            const fakeOPReply = getOPReply(true)
            fakeOPReply.author = { id: userID } as any

            td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([fakeOPReply])

            const fakeComment = getFakeGuessComment(userID)
            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return false if the bot has already posted a comment in the thread', () => {
            const fakeBot = getFakeBot()
            const botName = randomString()
            td.when(fakeBot.getAllRepliers(td.matchers.anything())).thenResolve([randomString(), randomString(), botName, randomString()])

            const fakeComment = getFakeGuessComment()
            return new CommentProcessor(fakeBot, undefined, { bot_username: botName }).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return true if the post is flaired easy and the guesser has < 10 points', () => {
            const fakeSubmission = getFakeSubmission('easy')
            const fakeBot = getFakeBot(fakeSubmission)

            const username = randomString()
            td.when(fakeBot.getUserPoints(td.matchers.not(username))).thenResolve(Math.floor(Math.random()*10) + 10)
            td.when(fakeBot.getUserPoints(username)).thenResolve(Math.floor(Math.random()*9))
            const fakeComment = getFakeGuessComment(null, username)

            return new CommentProcessor(fakeBot).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, true))
        })

        it('should return false if the post is flaired easy and the guesser has >= 10 points', () => {
            const fakeSubmission = getFakeSubmission('easy')
            const fakeBot = getFakeBot(fakeSubmission)

            const username = randomString()
            td.when(fakeBot.getUserPoints(username)).thenResolve(Math.floor(Math.random()*10) + 10)
            td.when(fakeBot.getUserPoints(td.matchers.not(username))).thenResolve(Math.floor(Math.random()*9))
            const fakeComment = getFakeGuessComment(null, username)

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

        it('should return false if the comment contains a valid confirmation, but as part of another word', () => {
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

    describe('replyWithBotMessage', () => {
        it('should render the template with the right values', () => {
            const fakeBot = td.object(new RedditBot())
            const replyTemplate = fs.readFileSync(path.resolve(__dirname, "../reply_template.md"), "UTF-8")

            const guesser = randomString()
            const poster = randomString()

            const templateValues = {
                guesser,
                guesser_points: 6,
                poster,
                poster_points: 3,
                subreddit: require('../config.json').subreddit
            }

            const expectedTemplate = Mustache.render(replyTemplate, templateValues)

            const mockOPComment = td.object({} as any)
            mockOPComment.reply = td.func('reply')

            return new CommentProcessor(fakeBot).replyWithBotMessage(false, mockOPComment, guesser, poster)
                .then(() => td.verify(mockOPComment.reply(expectedTemplate)))
        })

        it('should distinguish the posted comment', () => {
            const fakeBot = td.object(new RedditBot())
            const mockWinningComment = td.object({} as any)
            const mockOPComment = td.object({} as any)
            const mockPostedComment = td.object({} as any)
            const guesser = randomString()
            const poster = randomString()

            mockOPComment.reply = td.func('reply')
            mockPostedComment.distinguish = td.func('distinguish')
            td.when(mockOPComment.reply(td.matchers.anything())).thenResolve(mockPostedComment)

            return new CommentProcessor(fakeBot).replyWithBotMessage(false, mockOPComment, guesser, poster)
                .then(() => td.verify(mockPostedComment.distinguish()))
        })
    })
})

function getFakeBot(submission?: Submission): RedditBot {
    // This bot will return a valid, unsolved submission that confirms any comment
    const fakeBot = td.object(new RedditBot())
    const fakeSubmission = submission ? submission : td.object({} as Submission)
    td.when(fakeBot.getPostFromComment(td.matchers.anything())).thenResolve(fakeSubmission)
    td.when(fakeBot.getAllRepliers(td.matchers.anything())).thenResolve([])
    td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([getOPReply()])

    return fakeBot
}

function getFakeSubmission(flair?: string): Submission {
    const fakeSubmission = td.object({} as Submission)
    fakeSubmission.link_flair_text = flair ? flair : null

    return fakeSubmission
}

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

function getFakeGuessComment(id: string = randomString(), name: string = randomString()): Comment {
    const fakeComment = td.object({} as any)
    fakeComment.author = { id, name }
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