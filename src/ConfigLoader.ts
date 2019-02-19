import { Logger } from "./Logger";

export class ConfigLoader {
    config
    logger

    constructor(logger = Logger.safeLogger()) {
        let defaultConfig, providedConfig

        try {
            defaultConfig = require('../default-config.json')
            providedConfig = require('../config.json')
        } catch(ex) {
            logger.error('Failed to load config file:')
            logger.error(ex)
        }

        this.config = Object.assign(defaultConfig, providedConfig)
    }

    getConfig() {
        return this.config;
    }
}