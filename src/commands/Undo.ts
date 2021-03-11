import { RedditBot } from "../RedditBot";
import { Comment } from "snoowrap";

export default async (bot: RedditBot, comment: Comment) => {
  // Check reported comment was by bot
  // Check reported comment is a reply
  // Check post has identified flair
  // Get original guesser and submitter
  // Calculate negative points adjustment (search GIS again or parse comment?)
  // Call score manager
  // Delete comment
  // Unflair post (or set back to easy/hard)
}