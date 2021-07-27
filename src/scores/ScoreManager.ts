import { Logger } from "../Logger";
import { RedditBot } from "../RedditBot";

import { getScores, Scores } from './Scores'
import FlairManager from './ScoreFlairManager'
import * as fileManager from './ScoreFileManager'

export default (bot: RedditBot) => {
  const flairManager = FlairManager(bot)

  const getUserPoints = async (username: string): Promise<number> => {
    const totalScores = fileManager.getScoreData(fileManager.getTotalFileName())
    if(totalScores?.[username]?.points) return totalScores[username].points
    const flairPoints = await flairManager.getPoints(username)
    if(flairPoints) return flairPoints

    // getPoints will always return 0, so this probably isn't needed
    // Back up just in case the reddit api blows up or something
    return 0
  }

  return {
    getUserPoints,
    recordWin: async (guesser: string, submitter: string, foundOnGoogle = false): Promise<Scores> => {
      const points = getScores(foundOnGoogle)

      if(bot.readOnly) {
        Logger.warn(`Skipping score updates as read-only mode is enabled`)
        return points
      }

      const guesserPoints = await getUserPoints(guesser)
      const submitterPoints = await getUserPoints(submitter)

      await flairManager.setPoints(guesser, guesserPoints + points.guesser)
      await fileManager.recordGuess(guesser, points.guesser)

      await flairManager.setPoints(submitter, submitterPoints + points.submitter)
      await fileManager.recordSubmission(submitter, points.submitter)

      return points
    },
    addPoints: async (username: string, pointsEarned: number): Promise<void> => {
      if(bot.readOnly) {
        Logger.warn(`Skipping score updates as read-only mode is enabled`)
        return
      }

      const points = await getUserPoints(username)
      await flairManager.setPoints(username, points + pointsEarned)
      await fileManager.recordPoints(username, pointsEarned)
    },
    deductWin: async (guesser?: string, submitter?: string): Promise<void> => {
      if(!guesser && !submitter) return

      if(bot.readOnly) {
        Logger.warn(`Skipping score updates as read-only mode is enabled`)
        return
      }

      if(guesser) await fileManager.deductGuess(guesser)
      if(submitter) await fileManager.deductSubmission(submitter)
    }
  }
}