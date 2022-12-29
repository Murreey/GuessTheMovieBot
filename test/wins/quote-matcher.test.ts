import getQuote from '../../src/wins/quote-matcher'

jest.mock('../../quotes.json', () => [
  {
    names: ['test1', 'test2'],
    quotes: ['quote1', 'quote2']
  },
  {
    names: ['test3'],
    quotes: ['quote3']
  },
  {
    names: ['Star Wars: Episode IV - A New Hope', 'Star Wars: Episode IV', 'A New Hope'],
    quotes: ['to boldly go']
  },
], { virtual: true })

describe('quote matcher', () => {
  it('returns undefined if the movie was not recognised', () => {
    expect(getQuote('unknown')).toBeUndefined()
  })

  it('returns one of the chosen quotes if the movie was matched', () => {
    expect(['quote1', 'quote2']).toContain(getQuote('test1'))
  })

  it('matches on any of the variations of the movie name', () => {
    expect(getQuote('test3')).toBe('quote3')
    expect(getQuote('Test 3')).toBe('quote3')
    expect(getQuote('Test 3!')).toBe('quote3')
    expect(getQuote('Test 3?')).toBe('quote3')
    expect(getQuote('Test 3 (1979)')).toBe('quote3')
    expect(getQuote('Test 3? The original one')).toBe('quote3')

    expect(getQuote('Star Wars Episode IV - A New Hope? (1977)')).toBe('to boldly go')
    expect(getQuote('A New Hope')).toBe('to boldly go')
    expect(getQuote('Star Wars Episode IV')).toBe('to boldly go')
    expect(getQuote('Star Wars: Episode IV?')).toBe('to boldly go')
  })
})