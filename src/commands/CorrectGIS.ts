import { RedditBot } from "../RedditBot";
import { Comment } from "snoowrap";

export default async (bot: RedditBot, comment: Comment) => {
  // Check reported comment was by bot
  // Check it detected GIS
  // Get original guesser and submitter
  // Calculate GIS->non-GIS points adjustment
  // Call score manager
  // (Possibly refactor score manager to allow custom point values)
  // Edit comment
}