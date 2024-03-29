import { Logger } from './Logger'
import { Config } from './types'

export const getConfig = (): Config => {
  let defaultConfig, providedConfig

  try {
    defaultConfig = require('../default-config.json')
    providedConfig = require('../config.json')
  } catch (ex) {
    Logger.error('Failed to load config file:')
    Logger.error(ex.stack)
  }

  return Object.assign(defaultConfig, providedConfig)
}