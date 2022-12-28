import axios, { AxiosInstance } from 'axios'
import { Logger } from './Logger'

export const trimImageURL = (url: string): string => {
  if (!url) return url
  // Extract the first valid URL from the post
  // In case of inside markdown [](), or with whitespace, or two images, or whatever
  // Replaces annoying  preview URLs (https://preview.redd.it/4l3hm6mhezl61.png?width=1920&format=png&auto=webp&s=763dbf14da80516b2559cd1ffec8610a7b67359e)
  // With versions that work without the query params (https://i.redd.it/4l3hm6mhezl61.png)
  return url
    .match(/https?:\/\/([^ ?])+?(png|jpg|jpeg|gif|bmp|tiff)/i)?.[0]
    .trim()
    .replace(/(?<=https?:\/\/)(preview)(?=\.redd\.it\/)/ig, 'i')
}

export const getSearchUrl = (imageUrl: string): string => {
  const url = trimImageURL(imageUrl)
  if (!url) return undefined
  return `https://images.google.com/searchbyimage?hl=en&gl=en&q=${encodeURIComponent('image -site:reddit.com')}&image_url=${encodeURIComponent(url)}`
}

export const checkGoogleForImage = async (url: string): Promise<boolean> => {
  const client: AxiosInstance = axios.create({
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36' }
  })

  const searchUrl = getSearchUrl(url)
  if (!searchUrl) return false
  Logger.debug('Checking GIS for image:')
  Logger.debug(searchUrl)
  const searchResult = (await client.get(searchUrl)).data
  return searchResult.indexOf('Pages that include matching images') > -1
}