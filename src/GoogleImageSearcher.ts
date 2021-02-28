import axios, { AxiosInstance } from 'axios'
import { Logger } from './Logger'

export const isImageURL = (url: string): boolean => {
  return /^(http(s?):\/\/)([/|.|\w|\s|-])*\.(?:jpg|jpeg|gif|png|bmp|tiff)$/i.test(trimImageURL(url))
}

const trimImageURL = (url: string): string => {
  if(!url) return url
  return url.toLowerCase().split('?')[0].replace('&#x200b;', '').trim()
}

export const checkGoogleForImage = async (url: string): Promise<boolean> => {
  const client: AxiosInstance = axios.create({
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36' }
  })

  url = trimImageURL(url).split('?')[0]

  if(!isImageURL(url)) return false

  const searchURL = `https://images.google.com/searchbyimage?hl=en&gl=en&q=${encodeURIComponent('image -site:reddit.com')}&image_url=${encodeURIComponent(url)}`
  Logger.verbose(`Checking GIS for image:`)
  Logger.verbose(searchURL)
  const searchResult = (await client.get(searchURL)).data
  return searchResult.indexOf("Pages that include matching images") > -1
}