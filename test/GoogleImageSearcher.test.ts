import { isImageURL } from '../src/GoogleImageSearcher'

describe('isImageURL', () => {
  it('correctly validates image URLs', () => {
    const valid = [
      "http://image.com/image.png", "https://image.com/image.png",
      "http://image.com/image.jpg", "https://image.com/image.jpg",
      "http://image.com/image.jpeg", "https://image.com/image.jpeg",
      "http://image.com/image.gif", "https://image.com/image.gif",
      "http://image.com/image.bmp", "https://image.com/image.bmp",
      "http://image.com/image.tiff", "https://image.com/image.tiff",
      "HTTP://IMAGE.COM/IMAGE.PNG", "     http://image.com/image.png",
      "     http://image.com/image.png    ", "http://image.com/image.png   ",
      "http://image.com/image.png?foo=bar", "http://image.com/image.png?",
      `

          https://image.com/image.png

      `
    ]
    const invalid = [
      "image.com/image.png", "foo", "http://image.com/image.mp4",
      "https://image.com/image", "https://image.com/image?image=name.png"
    ]

    valid.forEach(u => expect(isImageURL(u)).toBe(true))
    invalid.forEach(u => expect(isImageURL(u)).toBe(false))
  })
})