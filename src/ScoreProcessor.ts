import { Comment, Submission, ReplyableContent } from 'snoowrap';
import { FlairTemplate } from 'snoowrap/dist/objects/Subreddit';
import { RedditBot } from './RedditBot'
import * as fs from 'fs'
import * as path from 'path'
import * as Mustache from 'mustache'
import { GoogleImageSearcher } from './GoogleImageSearcher';
import { Logger } from './Logger'

export class ScoreProcessor {
    bot: RedditBot
    config: any
    logger: any

    defaultPoints

    constructor(bot, logger = Logger.safeLogger(), config?) {
        this.bot = bot
        this.logger = logger
        this.config = config ? config : this.config = require('../config.json')

        this.defaultPoints =  {
            guesser: {
                normal: 6,
                google: 1
            },
            submitter: {
                normal: 3,
                google: 2
            }
        }
    }

    async processWin(username: string, type: WinType, foundOnGoogle: boolean): Promise<number> {
        const pointsToAward = this.winTypeToPoints(type, foundOnGoogle)
        await this.addPoints(username, pointsToAward)
        return Promise.resolve(pointsToAward)
    }

    async addPoints(username: string, points: number) {
        const currentPoints = await this.bot.getUserPoints(username)
        await this.bot.setUserPoints(username, currentPoints + points)
        this.logger.verbose(`Added ${points} to ${username} - had ${currentPoints}, now has ${currentPoints + points}`)
    }

    winTypeToPoints(winType: WinType, foundOnGoogle: boolean): number {
        const type = WinType[winType].toLowerCase() // Converts enum int to lowercase string representation
        const googled = foundOnGoogle ? 'google' : 'normal'

        if(this.config && this.config.points && this.config.points[type] && this.config.points[type][googled]) {
            return this.config.points[type][googled]
        }

        return this.defaultPoints[type][googled]
    }
}

export enum WinType {
    GUESSER,
    SUBMITTER
}