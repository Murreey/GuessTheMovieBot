import axios, { AxiosInstance } from 'axios'
import { Logger } from './Logger'

const isImageURL = (url: string): boolean => {
  const fileExtensions = ["png", "jpg", "jpeg", "bmp", "tiff"]
  return fileExtensions.some(extension => url.toLowerCase().endsWith(`.${extension}`))
}

export const checkGoogleForImage = async (url: string): Promise<boolean> => {
  const client: AxiosInstance = axios.create({
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36' }
  })

  url = url.split('?')[0]

  if(!isImageURL(url)) return false

  const searchURL = `https://images.google.com/searchbyimage?hl=en&gl=en&q=${encodeURIComponent('-site:reddit.com')}&image_url=${encodeURIComponent(url)}`
  Logger.verbose(`Checking GIS for image:`)
  Logger.verbose(searchURL)
  const searchResult = (await client.get(searchURL)).data
  return searchResult.indexOf("Pages that include matching images") > -1
}