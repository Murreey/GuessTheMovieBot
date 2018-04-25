import * as winston from 'winston'
import * as DailyRotateFile from 'winston-daily-rotate-file'

export class Logger {
    logger
    consoleTransport
    logFileTransport

    constructor() {
        this.logFileTransport = new DailyRotateFile({
            filename: '%DATE%.log',
            dirname: 'logs',
            maxFiles: '14d',
            level: 'info',
            datePattern:'YYYY-MM-[week]-w',
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'HH:mm:ss'
                }),
                winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
            )
        })
        this.consoleTransport = new winston.transports.Console()

        this.logger = winston.createLogger({
            format: winston.format.printf(info => `${info.message}`),
            transports: [this.logFileTransport]
        })

        this.logger.enableFileLogging = () => this.logger.add(this.logFileTransport)
        this.logger.disableFileLogging = () => this.logger.remove(this.logFileTransport)

        this.logger.enableConsoleLogging = (level: string = 'silly') => { 
            this.consoleTransport.level = level
            this.logger.add(this.consoleTransport)
        }
        this.logger.disableConsoleLogging = () => this.logger.remove(this.consoleTransport)
    }

    getLogger() {
        return this.logger
    }

    // As TypeScript doesn't have null safety operators, I'm doing this.
    // Any function that takes the Logger will default to grab this thing, which has all the
    // functions required, but they do nothing. TypeScript plz 🙏
    // I don't really know of a better solution to this, without making every single log call `logger ? logger.info() : {}`
    // (Also Winston 3 doesn't have types yet which is why it's any-ville)
    static safeLogger() {
        return {
            error: (...args) => {},
            warn: (...args) => {},
            info: (...args) => {},
            verbose: (...args) => {},
            debug: (...args) => {},
            silly: (...args) => {},
            enableConsoleLogging: (...args) => {},
            disableConsoleLogging: (...args) => {},
            enableFileLogging: (...args) => {},
            disableFileLogging: (...args) => {},
        }
    }
}