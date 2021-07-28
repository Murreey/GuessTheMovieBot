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
    recordWin: async (postID: string, guesser: string, submitter: string, foundOnGoogle = false): Promise<Scores> => {
      const points = getScores(foundOnGoogle)

      if(bot.readOnly) {
        Logger.warn(`Skipping score updates as read-only mode is enabled`)
        return points
      }

      const guesserPoints = await db.getUserScore(guesser)
      const submitterPoints = await db.getUserScore(submitter)

      await flairManager.setPoints(guesser, guesserPoints + points.guesser)
      await flairManager.setPoints(submitter, submitterPoints + points.submitter)

      await db.recordWin(postID, guesser, submitter, points)

      return points
    },
    removeWin: async (postID: string): Promise<void> => {
      if(bot.readOnly) {
        Logger.warn(`Skipping score updates as read-only mode is enabled`)
        return
      }

      await db.deleteWin(postID)

      // TODO flair updates
    },
    updatePoints: async (postID: string, foundOnGoogle = false): Promise<Scores> => {
      const points = getScores(foundOnGoogle)

      if(bot.readOnly) {
        Logger.warn(`Skipping score updates as read-only mode is enabled`)
        return points
      }

      await db.editPoints(postID, points)

      // TODO flair updates

      return points
    }
  }
}