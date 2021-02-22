import snoowrap from "snoowrap";
import { RedditBot } from "./RedditBot";

export default (bot: RedditBot) => ({
  getPoints: async (user: snoowrap.RedditUser): Promise<number> => {
    return 10
  },
  addPoints: async (user: snoowrap.RedditUser, amount: number): Promise<void> => {
    return
  }
})