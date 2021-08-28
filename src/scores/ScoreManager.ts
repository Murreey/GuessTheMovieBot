import { Logger } from "../Logger";
import { RedditBot } from "../RedditBot";

import { getScores, Scores } from './Scores'
import FlairManager from './ScoreFlairManager'
import DatabaseManager from "./DatabaseManager";
import { DatabaseManager as DatabaseManagerType } from "../types";
import snoowrap from "snoowrap";

const millisecondTimeStamp = (timestamp: number): number => {
  // Convert timestamps in seconds to miliseconds
  // All DB timestamps are millis, for easier use of .getTime()
  // This will stop working in the year 5138, sorry in advance
  if(timestamp.toString().length < 12) {
    return timestamp * 1000
  }

  return timestamp
}

export default async (bot: RedditBot, db?: DatabaseManagerType) => {
  const flairManager = FlairManager(bot)
  if(!db) db = await DatabaseManager()

  return {
    getUserPoints: db.getUserScore,
    recordWin: async (submission: snoowrap.Submission, guessComment: snoowrap.Comment, foundOnGoogle = false): Promise<Scores> => {
      const points = getScores(foundOnGoogle)

      if(bot.readOnly) {
        Logger.warn(`Skipping score updates as read-only mode is enabled`)
        return points
      }

      const postCreatedAt = millisecondTimeStamp(await submission.created_utc)
      const postSolvedAt = millisecondTimeStamp(await guessComment.created_utc)

      const submitter = await submission?.author?.name
      const guesser = await guessComment?.author?.name

      if(!submitter || !guesser || submitter === "[deleted]" || guesser === "[deleted]") {
        throw new Error(`Could not record win on post ${await submission.id}! Looks like something was deleted.`)
      }

      await db.recordWin(await submission.id, postCreatedAt, postSolvedAt, guesser, submitter, points)

      await flairManager.setPoints(guesser, await db.getUserScore(guesser))
      await flairManager.setPoints(submitter, await db.getUserScore(submitter))

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