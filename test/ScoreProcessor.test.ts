import 'mocha'
import * as assert from 'assert'
import * as td from 'testdouble'
import { ScoreProcessor } from '../src/ScoreProcessor';
import { RedditBot } from '../src/RedditBot'

describe('ScoreProcessor', () => {
    describe('addPoints', () => {
        it('should set user points to the new total', () => {
            const fakeBot = td.object(new RedditBot({}, {} as any, false))
            const username = randomString()

            const currentPoints = Math.floor(Math.random() * 50)
            const newPoints = Math.ceil((Math.random() + 1) * 3)

            td.when(fakeBot.getUserPoints(username)).thenResolve(currentPoints)

            return new ScoreProcessor(fakeBot, {}, undefined).addPoints(username, newPoints)
                .then(() => td.verify(fakeBot.setUserFlair(username, currentPoints + newPoints, td.matchers.anything())))
        })

        it('should add negative points', () => {
            const fakeBot = td.object(new RedditBot({}, {} as any, false))
            const username = randomString()

            const currentPoints = Math.floor(Math.random() * 50)
            const newPoints = Math.ceil((Math.random() + 1) * 3)

            td.when(fakeBot.getUserPoints(username)).thenResolve(currentPoints)

            return new ScoreProcessor(fakeBot, {}, undefined).addPoints(username, -newPoints)
                .then(() => td.verify(fakeBot.setUserFlair(username, currentPoints - newPoints, td.matchers.anything())))
        })
    })

    // Going to leave this whole bank as pending
    // Needs some thought and some kind of... randomised JSON creation?
    // Plus randomly removing valid keys to ensure fallback to the defaults
    // TDD™
    describe.skip('winTypeToPoints', () => {
        it('should convert a WinType to the correct amount of points set in the config', () => {
            const config = {
                points: {
                    guesser: {
                        normal: 1234
                    },
                    submitter: {
                        normal: 5678
                    }
                }
            }

            const score = new ScoreProcessor(undefined, config, undefined).winTypeToPoints(0, false)
            assert.equal(score, 1234)
        })
    })
})

function randomString(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}