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

  it.each([
    ["!correct", ForceCorrect],
    ["!gis", CorrectGIS],
    ["!google", CorrectGIS],
    ["!undo", Undo],
    ["!remove", Undo],
    ["!CORRECT", ForceCorrect],
    ["    !correct   ", ForceCorrect],
  ])(`calls the correct command processor for '%s'`, (input, processor) => {
    CommandProcessor({} as any, {} as any, input)
    expect(processor).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["!correct", ForceCorrect],
    ["!gis", CorrectGIS],
    ["!undo", Undo],
  ])(`does not call other command processors`, (input, processor) => {
    CommandProcessor({} as any, {} as any, input);
    [CorrectGIS, ForceCorrect, Undo]
      .filter(p => p !== processor)
      .forEach(p => expect(p).not.toHaveBeenCalled())
  })

  it.each([
    ["!correct with other stuff"],
    ["! correct"],
    ["correct"],
    ["foo"],
  ])(`does not call a command processor for an invalid input`, (input) => {
    CommandProcessor({} as any, {} as any, input);
    [CorrectGIS, ForceCorrect, Undo]
      .forEach(p => expect(p).not.toHaveBeenCalled())
  })
})