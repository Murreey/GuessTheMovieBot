import 'mocha'
import * as assert from 'assert'
import * as td from 'testdouble'
import { RedditBot } from '../src/RedditBot'
import { WinValidator } from '../src/WinValidator'
import { Command } from '../src/ModCommandProcessor'
import { Comment, Submission } from 'snoowrap'
import { FlairTemplate } from 'snoowrap/dist/objects/Subreddit'
import { ScoreProcessor } from '../src/ScoreProcessor';

describe('WinValidator', () => {
    describe('checkCommentIsValidWin', () => {
        it('should return true if comment matches criteria', () => {
            const fakeBot = getFakeBot()
            const fakeComment = getFakeGuessComment()
            return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, true))
        })

        describe('when the post is a self post', () => {
            it('should return true if the body only contains an image link', () => {
                const fakeSubmission = getFakeSubmission()
                fakeSubmission.is_self = true
                fakeSubmission.selftext = 'http://i.imgur.com/whatever.jpg'
                const fakeBot = getFakeBot(fakeSubmission)

                const fakeComment = getFakeGuessComment()
                return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                    .then((valid) => assert.equal(valid, true))
            })

            it('should set the submission url to the one from the body', () => {
                const fakeSubmission = getFakeSubmission()
                fakeSubmission.is_self = true
                const url = 'http://i.imgur.com/whatever.jpg'
                fakeSubmission.selftext = url
                const fakeBot = getFakeBot(fakeSubmission)

                const fakeComment = getFakeGuessComment()
                return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                    .then(() => assert.equal(fakeSubmission.url, url))
            })

            it('should strip whitespace and illegal characters from the url', () => {
                const fakeSubmission = getFakeSubmission()
                fakeSubmission.is_self = true
                const url = 'http://i.imgur.com/whatever.jpg'
                fakeSubmission.selftext = `    \n \n   ${url}  &#x200B;   `
                const fakeBot = getFakeBot(fakeSubmission)

                const fakeComment = getFakeGuessComment()
                return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                    .then(() => assert.equal(fakeSubmission.url, url))
            })

            it('should return false if the body is missing', () => {
                const fakeSubmission = getFakeSubmission()
                fakeSubmission.is_self = true
                const fakeBot = getFakeBot(fakeSubmission)

                const fakeComment = getFakeGuessComment()
                return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                    .then((valid) => assert.equal(valid, false))
            })

            it('should return false if the body does not contain an image link', () => {
                const fakeSubmission = getFakeSubmission()
                fakeSubmission.is_self = true
                fakeSubmission.selftext = 'Some text'
                const fakeBot = getFakeBot(fakeSubmission)

                const fakeComment = getFakeGuessComment()
                return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                    .then((valid) => assert.equal(valid, false))
            })

            it('should return false if the body does not only contain an image link', () => {
                const fakeSubmission = getFakeSubmission()
                fakeSubmission.is_self = true
                fakeSubmission.selftext = 'Here is my submission https://i.imgur.com/image.jpg'
                const fakeBot = getFakeBot(fakeSubmission)

                const fakeComment = getFakeGuessComment()
                return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                    .then((valid) => assert.equal(valid, false))
            })

            it('should return false if the body is empty', () => {
                const fakeSubmission = getFakeSubmission()
                fakeSubmission.is_self = true
                fakeSubmission.selftext = ''
                const fakeBot = getFakeBot(fakeSubmission)

                const fakeComment = getFakeGuessComment()
                return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                    .then((valid) => assert.equal(valid, false))
            })
        })

        it('should return false if reported comment was posted by the OP of the post', () => {
            const fakeSubmission = getFakeSubmission()
            const fakeBot = getFakeBot(fakeSubmission)

            const fakeComment = getFakeGuessComment()
            const authorId = randomString()
            fakeSubmission.author = { id: authorId } as any
            fakeComment.author = { id: authorId } as any

            return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        // apparently people do this so we need to account for it...
        it('should return false if the post OP has deleted their account', () => {
            const fakeSubmission = getFakeSubmission()
            fakeSubmission.author = { name: '[deleted]' } as any

            const fakeBot = getFakeBot(fakeSubmission)
            const fakeComment = getFakeGuessComment()
            return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return false if post already has identified flair', () => {
            const fakeSubmission = getFakeSubmission('identified')
            const fakeBot = getFakeBot(fakeSubmission)

            const fakeComment = getFakeGuessComment()
            return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return false if post is flaired as meta', () => {
            const fakeSubmission = getFakeSubmission('meta')
            const fakeBot = getFakeBot(fakeSubmission)

            const fakeComment = getFakeGuessComment()
            return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return true if post has a difficulty flair', () => {
            const validFlairs = ['easy', 'hard']
            const fakeSubmission = getFakeSubmission(validFlairs[Math.floor(Math.random() * validFlairs.length)])
            const fakeBot = getFakeBot(fakeSubmission)

            const fakeComment = getFakeGuessComment()
            return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, true))
        })

        it('should return false if it has no replies from OP', () => {
            const fakeBot = getFakeBot()
            td.when(fakeBot.getOPReplies(td.matchers.anything(), td.matchers.anything())).thenResolve([])

            const fakeComment = getFakeGuessComment()
            return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return false if it has OP has replied but not with a confirmation', () => {
            const fakeBot = getFakeBot()

            td.when(fakeBot.getOPReplies(td.matchers.anything(), td.matchers.anything())).thenResolve([getOPReply(false)])

            const fakeComment = getFakeGuessComment()
            return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return false if comment has multiple replies with no confirmation', () => {
            const fakeBot = getFakeBot()

            td.when(fakeBot.getOPReplies(td.matchers.anything(), td.matchers.anything())).thenResolve([getOPReply(false), getOPReply(false)])

            const fakeComment = getFakeGuessComment()
            return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return true if comment has multiple replies with one confirming', () => {
            const fakeBot = getFakeBot()

            td.when(fakeBot.getOPReplies(td.matchers.anything(), td.matchers.anything())).thenResolve([getOPReply(false), getOPReply(true), getOPReply(false)])

            const fakeComment = getFakeGuessComment()
            return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, true))
        })

        // See the comment in WinValidator
        it.skip('should return false if the bot has already posted a comment in the thread', () => {
            const fakeBot = getFakeBot()
            const botName = randomString()
            td.when(fakeBot.getAllRepliers(td.matchers.anything())).thenResolve([randomString(), randomString(), botName, randomString()])

            const fakeComment = getFakeGuessComment()
            return new WinValidator(fakeBot, { bot_username: botName }, undefined).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        it('should return true if the post is flaired easy and the guesser has < 10 points', () => {
            const fakeSubmission = getFakeSubmission('easy')
            const fakeBot = getFakeBot(fakeSubmission)

            const username = randomString()
            td.when(fakeBot.getUserPoints(td.matchers.not(username))).thenResolve(Math.floor(Math.random()*10) + 10)
            td.when(fakeBot.getUserPoints(username)).thenResolve(Math.floor(Math.random()*9))
            const fakeComment = getFakeGuessComment(null, username)

            return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, true))
        })

        it('should return false if the post is flaired easy and the guesser has > 10 points', () => {
            const fakeSubmission = getFakeSubmission('easy')
            const fakeBot = getFakeBot(fakeSubmission)

            const username = randomString()
            td.when(fakeBot.getUserPoints(username)).thenResolve(11)
            td.when(fakeBot.getUserPoints(td.matchers.not(username))).thenResolve(9)
            const fakeComment = getFakeGuessComment(null, username)

            return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment)
                .then((valid) => assert.equal(valid, false))
        })

        describe('when the CONFIRM mod command is provided', () => {
            const commands = [Command.CONFIRM]

            it('should return true if it has OP has replied but not with a confirmation', () => {
                const fakeBot = getFakeBot()

                td.when(fakeBot.getOPReplies(td.matchers.anything(), td.matchers.anything())).thenResolve([getOPReply(false)])

                const fakeComment = getFakeGuessComment()

                return new WinValidator(fakeBot, {}, undefined).checkCommentIsValidWin(fakeComment, commands)
                    .then((valid) => assert.equal(valid, true))
            })
        })
    })

    describe('commentContainsConfirmation', () => {
        it('should return true if the comment is a valid reply', () => {
            const fakeBot = getFakeBot()

            const valid = new WinValidator(fakeBot, {}, undefined).commentContainsConfirmation(getOPReply().body)
            assert.equal(valid, true)
        })

        it('should return false if the comment is an invalid reply', () => {
            const fakeBot = getFakeBot()

            const valid = new WinValidator(fakeBot, {}, undefined).commentContainsConfirmation(getOPReply(false).body)
            assert.equal(valid, false)
        })

        it('should return false if the comment contains a valid confirmation, but as part of another word', () => {
            const fakeBot = getFakeBot()

            const valid = new WinValidator(fakeBot, {}, undefined).commentContainsConfirmation('No, it is not Eyes Wide Shut.')
            assert.equal(valid, false)
        })
    })

    describe('addIdentifiedFlair', () => {
        it('should set post flair to identified if it has no current flair', () => {
            const fakeBot = getFakeBot()
            const fakePost = td.object({} as any)
            fakePost.id = randomString()
            fakePost.selectFlair = td.func('selectFlair')

            const flairTypes = getFlairTemplates()
            td.when(fakeBot.getFlairTypes(fakePost.id)).thenResolve(flairTypes)

            const identified_template = flairTypes[0]

            new WinValidator(fakeBot, {}, undefined).addIdentifiedFlair(fakePost)
                .then(() => td.verify(fakePost.selectFlair(identified_template)))
        })

        it('should set post flair to `identified + easy` if it was an easy submission', () => {
            const fakeBot = getFakeBot()
            const fakePost = td.object({} as any)
            fakePost.id = randomString()
            fakePost.link_flair_text = 'easy'
            fakePost.selectFlair = td.func('selectFlair')

            const flairTypes = getFlairTemplates()
            td.when(fakeBot.getFlairTypes(fakePost.id)).thenResolve(flairTypes)

            const identified_template = flairTypes[1]

            new WinValidator(fakeBot, {}, undefined).addIdentifiedFlair(fakePost)
                .then(() => td.verify(fakePost.selectFlair(identified_template)))
        })

        it('should set post flair to `identified + hard` if it was an hard submission', () => {
            const fakeBot = getFakeBot()
            const fakePost = td.object({} as any)
            fakePost.id = randomString()
            fakePost.link_flair_text = 'hard'
            fakePost.selectFlair = td.func('selectFlair')

            const flairTypes = getFlairTemplates()
            td.when(fakeBot.getFlairTypes(fakePost.id)).thenResolve(flairTypes)

            const identified_template = flairTypes[2]

            new WinValidator(fakeBot, {}, undefined).addIdentifiedFlair(fakePost)
                .then(() => td.verify(fakePost.selectFlair(identified_template)))
        })
    })

    describe('replyWithBotMessage', () => {
        let fakeBot, fakeScoreProcessor, guesser, poster

        beforeEach(() => {
            fakeBot = getFakeBot()
            fakeScoreProcessor = getFakeScoreProcessor()
            guesser = randomString()
            poster = randomString()
        })

        describe('when read only mode is not enabled', () => {
            it('should reply to the comment with the score message', () => {
                const mockOPComment = td.object({} as any)
                mockOPComment.reply = td.func('reply')

                const reply = randomString()
                td.when(fakeScoreProcessor.generateScoreComment(td.matchers.anything(), td.matchers.anything(), td.matchers.anything(), td.matchers.anything())).thenReturn(reply)

                return new WinValidator(fakeBot, {}, undefined).replyWithBotMessage(fakeScoreProcessor, false, mockOPComment, guesser, poster)
                    .then(() => td.verify(mockOPComment.reply(reply)))
            })

            it('should distinguish the posted comment', () => {
                const mockOPComment = td.object({} as any)
                const mockPostedComment = td.object({} as any)

                mockOPComment.reply = td.func('reply')
                mockPostedComment.distinguish = td.func('distinguish')
                td.when(mockOPComment.reply(td.matchers.anything())).thenResolve(mockPostedComment)

                return new WinValidator(fakeBot, {}, undefined).replyWithBotMessage(fakeScoreProcessor, false, mockOPComment, guesser, poster)
                    .then(() => td.verify(mockPostedComment.distinguish()))
            })
        })

        describe('when read only mode is enabled', () => {
            beforeEach(() => {
                fakeBot.readonly = true
            })

            it('should not reply to the op comment', () => {
                const mockOPComment = td.object({} as any)
                mockOPComment.reply = td.func('reply')

                return new WinValidator(fakeBot, {}, undefined).replyWithBotMessage(fakeScoreProcessor, false, mockOPComment, guesser, poster)
                    .then(() => td.verify(mockOPComment.reply(), { times: 0 }))
            })

            it('should not distinguish the posted comment', () => {
                const mockOPComment = td.object({} as any)
                const mockPostedComment = td.object({} as any)

                mockOPComment.reply = td.func('reply')
                mockPostedComment.distinguish = td.func('distinguish')
                td.when(mockOPComment.reply(td.matchers.anything())).thenResolve(mockPostedComment)

                return new WinValidator(fakeBot, {}, undefined).replyWithBotMessage(fakeScoreProcessor, false, mockOPComment, guesser, poster)
                    .then(() => td.verify(mockPostedComment.distinguish(), { times: 0 }))
            })
        })
    })
})

function getFakeBot(submission?: Submission, postID?: string): RedditBot {
    // This bot will return a valid, unsolved submission that confirms any comment
    const fakeBot = td.object(new RedditBot({}, {} as any, false))
    const fakeSubmission = submission ? submission : getFakeSubmission(undefined, postID)
    td.when(fakeBot.getPostFromComment(td.matchers.anything())).thenResolve(fakeSubmission)
    td.when(fakeBot.getAllRepliers(td.matchers.anything())).thenResolve([])
    td.when(fakeBot.getOPReplies(td.matchers.anything())).thenResolve([getOPReply()])
    td.when(fakeBot.getOPReplies(td.matchers.anything(), td.matchers.anything())).thenResolve([getOPReply()])

    return fakeBot
}

function getFakeScoreProcessor(): ScoreProcessor {
    const fakeScoreProcessor = td.object(new ScoreProcessor({}, {}))
    return fakeScoreProcessor
}

function getFakeSubmission(flair?: string, postID: string = randomString()): Submission {
    const fakeSubmission = td.object({} as Submission)
    fakeSubmission.id = postID
    fakeSubmission.link_flair_text = flair ? flair : null
    fakeSubmission.author = { id: randomString(), name: randomString() } as any
    (fakeSubmission as any).fetch = td.func('fetch')
    td.when((fakeSubmission as any).fetch()).thenResolve(fakeSubmission)
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
    const fakeComment = td.object({} as Comment)
    fakeComment.author = { id, name } as any
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