import 'mocha'
import * as assert from 'assert'
import * as td from 'testdouble'
import { Comment } from 'snoowrap'
import { RedditBot } from '../src/RedditBot'
import { ModCommandProcessor, Command } from '../src/ModCommandProcessor';
import { ScoreProcessor, WinType } from '../src/ScoreProcessor';

describe('ModCommandProcessor', () => {
    const modCommandProcessor: ModCommandProcessor = new ModCommandProcessor({}, {}, { silly: (m) => console.log(m) } as any);

    describe('reportsToCommands', () => {
        let comment;
        beforeEach(() => {
            comment = getFakeComment()
        })

        it('should return an empty array if there were no reports', () => {
            assert.equal(modCommandProcessor.reportsToCommands(comment).length, 0)
        })

        it('should return an empty array if no reports matched commands', () => {
            comment.mod_reports = [
                ['invalid', 'username'],
                ['not a command', 'username'],
                ['random report', 'username']
            ]

            assert.equal(modCommandProcessor.reportsToCommands(comment).length, 0)
        })

        it('should return the command matched from a report', () => {
            comment.mod_reports = [
                ['gis', 'username']
            ]

            const commands = modCommandProcessor.reportsToCommands(comment)
            assert.equal(commands.length, 1)
            assert.equal(commands[0], Command.CORRECT_GIS)
        })

        it('should include all matched commands', () => {
            comment.mod_reports = [
                ['GIS', 'username'],
                ['not a command', 'username'],
                ['correct', 'username']
            ]

            const commands = modCommandProcessor.reportsToCommands(comment)
            assert.equal(commands.length, 2)
            assert.equal(commands[0], Command.CORRECT_GIS)
            assert.equal(commands[1], Command.CONFIRM)
        })

        it('should filter out duplicate commands', () => {
            comment.mod_reports = [
                ['GIS', 'username'],
                ['not a command', 'username'],
                ['GIS', 'username']
            ]

            const commands = modCommandProcessor.reportsToCommands(comment)
            assert.equal(commands.length, 1)
            assert.equal(commands[0], Command.CORRECT_GIS)
        })

        it('should filter out reports with no reason', () => {
            comment.mod_reports = [
                ['GIS', 'username'],
                ['not a command', 'username'],
                [null, 'username']
            ]

            const commands = modCommandProcessor.reportsToCommands(comment)
            assert.equal(commands.length, 1)
            assert.equal(commands[0], Command.CORRECT_GIS)
        })
    })

    describe('getCommand', () => {
        it('should return undefined if not a command', () => {
            assert.equal(modCommandProcessor.getCommand("not a command"), undefined)
        })

        it('should return report type of CORRECT_GIS if the command contains "gis"', () => {
            assert.equal(modCommandProcessor.getCommand("gis"), Command.CORRECT_GIS)
            assert.equal(modCommandProcessor.getCommand("GIS"), Command.CORRECT_GIS)
            assert.equal(modCommandProcessor.getCommand("gis error"), Command.CORRECT_GIS)
            assert.equal(modCommandProcessor.getCommand("correct GIS"), Command.CORRECT_GIS)
        })
    })

    describe('correctGISError', () => {
        let guesser, submitter, fakeGuessComment, fakeOPComment, fakeBotComment, fakeBot

        beforeEach(() => {
            guesser = randomString()
            submitter = randomString()
            fakeGuessComment = getFakeComment(guesser)
            fakeOPComment = getFakeComment(submitter)
            fakeBotComment = getFakeComment()
            fakeBot = getFakeBot(fakeBotComment)

            td.when(fakeBot.getParentComment(fakeBotComment)).thenResolve(fakeOPComment)
            td.when(fakeBot.getParentComment(fakeOPComment)).thenResolve(fakeGuessComment)
        })

        it('should call ScoreProcessor.correctGIS() with the correct values in the correct order', () => {
            const fakeScoreProcessor = getFakeScoreProcessor()

            return new ModCommandProcessor(fakeBot, { replyTemplate: 'test/test_reply_template.md' }).correctGISError(fakeBotComment, fakeScoreProcessor)
                .then(() => td.verify(fakeScoreProcessor.correctGIS(guesser, submitter, td.matchers.anything())))
        })

        it('should tell the ScoreProcessor to use full points if it was previously marked found', () => {
            const fakeScoreProcessor = getFakeScoreProcessor()

            fakeBotComment.body = '[+1](// "green")'

            return new ModCommandProcessor(fakeBot, { replyTemplate: 'test/test_reply_template.md' }).correctGISError(fakeBotComment, fakeScoreProcessor)
                .then(() => td.verify(fakeScoreProcessor.correctGIS(guesser, submitter, false)))
        })

        it('should tell the ScoreProcessor to use half points if it was previously marked not found', () => {
            const fakeScoreProcessor = getFakeScoreProcessor()

            fakeBotComment.body = '[+6](// "green")'

            return new ModCommandProcessor(fakeBot, { replyTemplate: 'test/test_reply_template.md' }).correctGISError(fakeBotComment, fakeScoreProcessor)
                .then(() => td.verify(fakeScoreProcessor.correctGIS(guesser, submitter, true)))
        })

        it.skip('should send the correct values to the template generator', () => {
            const fakeScoreProcessor = getFakeScoreProcessor()

            return new ModCommandProcessor(fakeBot, {}).correctGISError(fakeBotComment, fakeScoreProcessor)
                .then(() => td.verify(fakeScoreProcessor.generateScoreComment("", "", "", false)))
        })
    })
})

function getFakeBot(comment?: Comment, postID: string = randomString()): RedditBot {
    const fakeBot = td.object(new RedditBot({}, {} as any, false))
    const fakeComment = comment ? comment : td.object({} as Comment)
    td.when(fakeBot.getParentComment(td.matchers.anything())).thenResolve(fakeComment)
    td.when(fakeBot.getPostFromComment(td.matchers.anything())).thenResolve({
        fetch: () => ({ id: postID })
    })
    return fakeBot
}

function getFakeScoreProcessor(): ScoreProcessor {
    const fakeScoreProcessor = td.object(new ScoreProcessor({}, {} as any))
    td.when(fakeScoreProcessor.winTypeToPoints(WinType.GUESSER, false)).thenResolve(6)
    td.when(fakeScoreProcessor.winTypeToPoints(WinType.GUESSER, true)).thenResolve(1)
    td.when(fakeScoreProcessor.winTypeToPoints(WinType.SUBMITTER, false)).thenResolve(3)
    td.when(fakeScoreProcessor.winTypeToPoints(WinType.SUBMITTER, true)).thenResolve(2)
    fakeScoreProcessor.generateScoreComment = td.func('generateScoreComment') as any
    fakeScoreProcessor.correctGIS = td.func('correctGIS') as any
    return fakeScoreProcessor
}

function getFakeComment(username: string = randomString()): Comment {
    const fakeComment = td.object({} as any)
    fakeComment.author = { name: username }
    fakeComment.edit = td.func('edit')
    fakeComment.body = '[+1](// "green")'
    return fakeComment
}

function randomString(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}