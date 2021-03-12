import CommandProcessor from '../../src/commands/CommandProcessor'

import CorrectGIS from '../../src/commands/CorrectGIS'
import ForceCorrect from '../../src/commands/ForceCorrect'
import Undo from '../../src/commands/Undo'

jest.mock('../../src/commands/CorrectGIS')
jest.mock('../../src/commands/ForceCorrect')
jest.mock('../../src/commands/Undo')

describe('CommandProcessor', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  const bot: any = { readOnly: false }
  const comment: any = { approve: jest.fn() }

  it.each([
    ["!correct", ForceCorrect],
    ["!gis", CorrectGIS],
    ["!google", CorrectGIS],
    ["!undo", Undo],
    ["!remove", Undo],
    ["!CORRECT", ForceCorrect],
    ["    !correct   ", ForceCorrect],
  ])(`calls the correct command processor for '%s'`, async (input, processor) => {
    await CommandProcessor(bot, comment, input)
    expect(processor).toHaveBeenCalledTimes(1)
    expect(comment.approve).toHaveBeenCalled()
  })

  it.each([
    ["!correct", ForceCorrect],
    ["!gis", CorrectGIS],
    ["!undo", Undo],
  ])(`does not call other command processors`, async (input, processor) => {
    await CommandProcessor(bot, comment, input);
    [CorrectGIS, ForceCorrect, Undo]
      .filter(p => p !== processor)
      .forEach(p => expect(p).not.toHaveBeenCalled())
  })

  it.each([
    ["!correct with other stuff"],
    ["! correct"],
    ["correct"],
    ["foo"],
  ])(`does not call a command processor or approve the comment for an invalid input`, async (input) => {
    await CommandProcessor(bot, comment, input);
    expect(comment.approve).not.toHaveBeenCalled();
    [CorrectGIS, ForceCorrect, Undo]
      .forEach(p => expect(p).not.toHaveBeenCalled())
  })
})