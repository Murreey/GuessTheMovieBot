import snoowrap from "snoowrap";
import { Logger } from "./Logger";
import { RedditBot } from "./RedditBot";

const getCssClass = (points: number): string => {
  const thresholds = [1, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
  const threshold = thresholds.reverse().find(threshold => threshold <= points)
  return `points points-${threshold || 1}`
}

export default (bot: RedditBot) => {
  const getPoints = async (user: string): Promise<number> => {
    const flair = await bot.getUserFlair(user)
    if(flair === null) return 0
    return parseInt(flair.replace(/\D/g, '')) || 0
  }

  const addPoints = async (user: string, amount: number): Promise<void> => {
    const currentPoints = await getPoints(user)
    const newTotal = Math.max(0, currentPoints + amount)

    bot.setUserFlair(user, "" + newTotal, getCssClass(newTotal))

    Logger.info(`Gave ${amount} points to ${user} - now has ${newTotal}`)
    return
  }

  return {
    getPoints,
    addPoints
  }
}