# GuessTheMovieBot
![Travis](https://img.shields.io/travis/com/Murreey/GuessTheMovieBot.svg?logo=travis)
[![GitHub issues](https://img.shields.io/github/issues/Murreey/GuessTheMovieBot.svg?style=flat)](https://github.com/Murreey/GuessTheMovieBot/issues)

A Reddit Bot for managing the [/r/GuessTheMovie](https://www.reddit.com/r/GuessTheMovie) subreddit, where players post screenshots from movies and others try to guess which film it's from. 

This bot handles verifying correct guesses, and will hand out points to both the submitter and the guesser.

## Usage

- `npm install`
- `npm start` to start it running, checking for comments once a minute.

    - Alternatively `npm run readonly` to start it in a mode that will not make any real edits to Reddit, and only log out changes it would be making.

    - Or `npm run once` to just do one report check and stop once all comments are processed.
