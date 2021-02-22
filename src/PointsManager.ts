import snoowrap from "snoowrap";
import { Logger } from "./Logger";
import { RedditBot } from "./RedditBot";

export default (bot: RedditBot) => ({
  getPoints: async (user: snoowrap.RedditUser): Promise<number> => {
    return 10
  },
  addPoints: async (user: snoowrap.RedditUser, amount: number): Promise<void> => {
    Logger.info(`Gave ${amount} points to ${user.name}`)
    return
  }
})