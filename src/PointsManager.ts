import snoowrap from "snoowrap";
import { Logger } from "./Logger";
import { RedditBot } from "./RedditBot";

export default (bot: RedditBot) => ({
  getPoints: async (user: string): Promise<number> => {
    return 10
  },
  addPoints: async (user: string, amount: number): Promise<void> => {
    Logger.info(`Gave ${amount} points to ${user}`)
    return
  }
})