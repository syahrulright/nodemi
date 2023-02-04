import dotenv from 'dotenv'
import express from 'express'
dotenv.config()

let usingLocalStorage = true
if (process.env.MEDIA_USE_LOCAL_STORAGE == "false" || process.env.MEDIA_USE_LOCAL_STORAGE == false)
    usingLocalStorage = false

let host = process.env.APP_HOST ?? "http://localhost"
let port = process.env.APP_PORT ?? 5000

const mediaConfig = {
    localStorageDirectory: process.env.MEDIA_LOCAL_STORAGE_DIR_NAME ?? "storage",
    usingLocalStorage: usingLocalStorage,
    root_media_url: host + ":" + port + "/"
}

/**
 * Setup dir as public where media is stored 
 * @param {*} app express js app 
 */
const routeStoragePublic = (app) => {
    app.use(express.static(process.env.MEDIA_LOCAL_STORAGE_DIR_NAME ?? "storage"));
}

export default mediaConfig
export { routeStoragePublic }