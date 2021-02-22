import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
export class Logger {
    private static logger: winston.Logger

    static setup({ console = LogLevel.INFO, file = LogLevel.INFO }: LogLevels = { console: LogLevel.INFO, file: LogLevel.INFO}): void {
      this.logger = winston.createLogger({
        format: winston.format.printf(info => `${info.level.toUpperCase().padStart(8, " ")}:  ${info.message}`),
        transports: []
      })

      // `silent` ensures there's always at least one transport active
      // (required by winston)
      this.logger.add(new winston.transports.Console({ level: console, silent: console === null }))

      if(file) {
        this.logger.add(new DailyRotateFile({
          filename: '%DATE%.log',
          dirname: 'logs',
          level: file,
          datePattern:'YYYY-MM-[week]-w',
          format: winston.format.combine(
              winston.format.timestamp({
                  format: 'YYYY-MM-DD HH:mm:ss'
              }),
              winston.format.printf(info => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`)
          )
        }))
      }
    }

    static get(logLevels?: LogLevels): winston.Logger {
      if(!this.logger) this.setup(logLevels)
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

type LogLevels = {
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