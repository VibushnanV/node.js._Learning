
require('dotenv').config()
const webPush=require('web-push')
const express=require('express')
const app=express.Router()
const MongoClient=require('mongodb').MongoClient
const url =process.env.DB_URL
const authenticationSecretKey = process.env.AUTH_SECRET_KEY
const dataSeceretKey=process.env.DATA_SECRET_KEY

app.post('/sendNotification',(req,res)=>{
    webPush.setVapidDetails(
        'mailto: vibushvs@gmail.com',
        process.env.PUBLIC_VAPID_KEY,
        process.env.PRIVATE_VAPID_KEY 
    )
})
