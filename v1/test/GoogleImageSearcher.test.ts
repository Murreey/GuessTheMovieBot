import { trimImageURL } from '../src/GoogleImageSearcher'

describe('isImageURL', () => {
  it('correctly validates image URLs', () => {
    const valid = [
      'http://image.com/image.png', 'https://image.com/image.png',
      'http://image.com/image.jpg', 'https://image.com/image.jpg',
      'http://image.com/image.jpeg', 'https://image.com/image.jpeg',
      'http://image.com/image.gif', 'https://image.com/image.gif',
      'http://image.com/image.bmp', 'https://image.com/image.bmp',
      'http://image.com/image.tiff', 'https://image.com/image.tiff',
      'HTTP://IMAGE.COM/IMAGE.PNG', '     http://image.com/image.png',
      '     http://image.com/image.png    ', 'http://image.com/image.png   ',
      'http://image.com/image.png?foo=bar', 'http://image.com/image.png?',
      '[link in markdown](http://image.com/image.png)',
      `

          https://image.com/image.png

      `
    ]
    const invalid = [
      'image.com/image.png', 'foo', 'http://image.com/image.mp4',
      'https://image.com/image', 'https://image.com/image?image=name.png'
    ]

    valid.forEach(u => expect(trimImageURL(u)).toBeDefined())
    invalid.forEach(u => expect(trimImageURL(u)).not.toBeDefined())
  })

  it('extracts the first valid URL', () => {
    expect(trimImageURL('https://image.com/image.png https://image.com/image2.png')).toBe('https://image.com/image.png')
    expect(trimImageURL('    https://image.com/image.png https://image.com/image2.png    ')).toBe('https://image.com/image.png')
    expect(trimImageURL('    https://image.com?image=image.png https://image.com/image2.png    ')).toBe('https://image.com/image2.png')
    expect(trimImageURL('image.com/image.png http://image.com/image2.png')).toBe('http://image.com/image2.png')
  })

  it('replaces reddit preview links with direct image links', () => {
    expect(trimImageURL('https://preview.redd.it/image.png')).toBe('https://i.redd.it/image.png')
    expect(trimImageURL('https://preview.redd.it/image.png https://preview.redd.it/image2.png')).toBe('https://i.redd.it/image.png')
    expect(trimImageURL('some body text https://preview.redd.it/image.png')).toBe('https://i.redd.it/image.png')
    expect(trimImageURL('[link in markdown](https://preview.redd.it/image.png)')).toBe('https://i.redd.it/image.png')
  })
})