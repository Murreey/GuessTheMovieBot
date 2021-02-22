export interface Config {
  userAgent: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  subreddit: string,
  bot_username: string,
  replyTemplate: string,
  points: {
    [key in WinType]: {
      [key in PointLevel]: number
    }
  }
}

export enum WinType {
  GUESSER = "guesser",
  SUBMITTER = "submitter"
}

export enum PointLevel {
  NORMAL = "normal",
  GOOGLE = "google"
}
