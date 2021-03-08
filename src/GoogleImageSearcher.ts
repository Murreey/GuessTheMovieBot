import axios, { AxiosInstance } from 'axios'
import { Logger } from './Logger'

export const isImageURL = (url: string): boolean => {
  return /^(http(s?):\/\/)([/|.|\w|\s|-])*\.(?:jpg|jpeg|gif|png|bmp|tiff)$/i.test(trimImageURL(url))
}

const trimImageURL = (url: string): string => {
  if(!url) return url
  return url.split('?')[0].replace('&#x200b;', '').trim()
}

export const getSearchUrl = (imageUrl: string): string => {
  const url = trimImageURL(imageUrl).split('?')[0]
  if(!isImageURL(url)) return undefined
  return `https://images.google.com/searchbyimage?hl=en&gl=en&q=${encodeURIComponent('image -site:reddit.com')}&image_url=${encodeURIComponent(url)}`
}

export const checkGoogleForImage = async (url: string): Promise<boolean> => {
  const client: AxiosInstance = axios.create({
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36' }
  })

  const searchUrl = getSearchUrl(url)
  if(!searchUrl) return false
  Logger.debug(`Checking GIS for image:`)
  Logger.debug(searchUrl)
  const searchResult = (await client.get(searchUrl)).data
  return searchResult.indexOf("Pages that include matching images") > -1
}