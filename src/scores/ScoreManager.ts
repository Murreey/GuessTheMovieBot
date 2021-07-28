import { Logger } from "../Logger";
import { RedditBot } from "../RedditBot";

import { getScores, Scores } from './Scores'
import FlairManager from './ScoreFlairManager'
import DatabaseManager from "./DatabaseManager";

export default async (bot: RedditBot) => {
  const db = await DatabaseManager()
  const flairManager = FlairManager(bot)

  return {
    getUserPoints: db.getUserScore,
    recordWin: async (postID: string, postCreatedAt: number, guesser: string, submitter: string, foundOnGoogle = false): Promise<Scores> => {
      const points = getScores(foundOnGoogle)

      if(bot.readOnly) {
        Logger.warn(`Skipping score updates as read-only mode is enabled`)
        return points
      }

      await flairManager.syncPoints(guesser)
      await flairManager.syncPoints(submitter)

      await db.recordWin(postID, postCreatedAt, guesser, submitter, points)

      return points
    },
    removeWin: async (postID: string): Promise<void> => {
      if(bot.readOnly) {
        Logger.warn(`Skipping score updates as read-only mode is enabled`)
        return
      }

      await db.deleteWin(postID)
    },
    updatePoints: async (postID: string, foundOnGoogle = false): Promise<Scores> => {
      const points = getScores(foundOnGoogle)

      if(bot.readOnly) {
        Logger.warn(`Skipping score updates as read-only mode is enabled`)
        return points
      }

      await db.editPoints(postID, points)

      return points
    }
  }
}