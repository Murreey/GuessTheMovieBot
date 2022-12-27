import winston, { level } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
export class Logger {
    private static logger: winston.Logger

    static setup(loggers: Loggers = { console: LogLevel.INFO, file: LogLevel.INFO}): void {
      this.logger = winston.createLogger({
        transports: [
          new winston.transports.Console({
            level: loggers.console,
            silent: !loggers.console,
            format: winston.format.combine(
              winston.format(info => { info.level = info.message ? info.level.padStart(10, " ") + ':' : ""; return info })(),
              winston.format.colorize(),
              winston.format.printf(({ level, message }) => `${level}  ${message}`)
            )
          })
        ]
      })

      if(loggers.file) {
        this.logger.add(new DailyRotateFile({
          filename: '%DATE%.log',
          dirname: 'logs',
          level: loggers.file,
          silent: !loggers.file,
          datePattern:'YYYY-MM-[week]-w',
          format: winston.format.combine(
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.printf(info => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`)
          )
        }))
      }
    }

    static get(loggers?: Loggers): winston.Logger {
      if(!this.logger) this.setup(loggers)
      return this.logger
    }

    static error = (message: string) => Logger.get().log("error", message)
    static warn = (message: string) => Logger.get().log("warn", message)
    static info = (message: string) => Logger.get().log("info", message)
    static http = (message: string) => Logger.get().log("http", message)
    static verbose = (message: string) => Logger.get().log("verbose", message)
    static debug = (message: string) => Logger.get().log("debug", message)
    static silly = (message: string) => Logger.get().log("silly", message)
}

type Loggers = {
  console?: LogLevel,
  file?: LogLevel
}

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  HTTP = "http",
  VERBOSE = "verbose",
  DEBUG = "debug",
  SILLY = "silly"
}