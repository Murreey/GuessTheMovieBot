import axios, { AxiosInstance } from 'axios'

export class GoogleImageSearcher {
    client: AxiosInstance
    constructor(client?: AxiosInstance) {
        if(!this.client) {
            this.client = axios.create({
                headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11' }
            })
        }
    }

    foundImageResults(url: string): Promise<boolean> {
        url = url.split('?')[0]

        if(!this.isImageURL(url)){
            return Promise.resolve(false)
        }

        const searchURL = `https://images.google.com/searchbyimage?hl=en&gl=en&q=${encodeURIComponent('-site:reddit.com')}&image_url=${encodeURIComponent(url)}`
        return this.client.get(searchURL)
            .then((response) => response.data.indexOf("Pages that include matching images") > -1)
    }

    isImageURL(url: string): boolean {
        const fileExtensions = ["png", "jpg", "jpeg", "bmp", "tiff"]
        for(let extension of fileExtensions) {
            if(url.toLowerCase().endsWith(`.${extension}`)) {
                return true
            }
        }

        return false
    }
}