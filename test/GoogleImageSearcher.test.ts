import 'mocha'
import * as assert from 'assert'
import { GoogleImageSearcher } from '../src/GoogleImageSearcher';

describe('GoogleImageSearcher', () => {
    describe('isImageURL', () => {
        it('should return true if the URL ends with a valid extension', () => {
            const validExtensions = ["png", "jpg", "jpeg", "bmp", "tiff"]
            const url = `${randomString()}.${validExtensions[Math.floor(Math.random() * validExtensions.length)]}`

            assert.equal(new GoogleImageSearcher().isImageURL(url), true)
        })

        it('should return false if the URL does not end with a valid extension', () => {
            assert.equal(new GoogleImageSearcher().isImageURL(randomString()), false)
        })
    })
})

function randomString(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}