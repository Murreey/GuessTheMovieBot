import { Logger } from "../Logger";
import { RedditBot } from "../RedditBot";

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

  const setPoints = async (user: string, amount: number): Promise<void> => {
    if(amount < 0) amount = 0

    await bot.setUserFlair(user, "" + amount, getCssClass(amount))

    Logger.info(`Set ${user}'s points flair to ${amount}`)
  }

  return {
    getPoints,
    setPoints
  }
}