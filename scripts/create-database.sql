CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  username TEXT UNIQUE ON CONFLICT IGNORE
);

CREATE TABLE IF NOT EXISTS wins (
  post_id TEXT PRIMARY KEY NOT NULL,
  guesser_id INTEGER,
  submitter_id INTEGER,
  created_at TIMESTAMP NOT NULL,
  solved_at TIMESTAMP DEFAULT(strftime('%s', 'NOW')*1000) NOT NULL,
  FOREIGN KEY (guesser_id) REFERENCES users(user_id),
  FOREIGN KEY (submitter_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS points (
  post_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  points INTEGER NOT NULL,
  UNIQUE (post_id, user_id) ON CONFLICT REPLACE,
  FOREIGN KEY (post_id) REFERENCES wins(post_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS legacy_imports (
  user_id INTEGER PRIMARY KEY NOT NULL,
  points INTEGER NOT NULL,
  guesses INTEGER NOT NULL,
  submissions INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);