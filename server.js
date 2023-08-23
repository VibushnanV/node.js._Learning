require('dotenv').config()
const express=require('express')
const app=express()
const bodyparser=require('body-parser')
const cors=require('cors')
const basicAuth = require('express-basic-auth')
app.use(bodyparser.json({}))
app.use(bodyparser.urlencoded({
    extended:true
}))
app.use(cors({origin:true}))
const Auth_name=process.env.BASIC_AUTH_NAME
const Auth_pass=process.env.BASIC_AUTH_PASSWORD
const PORT=process.env.PORT||8080
const authAPI=require('./authentication')
const mailAPI=require('./sendMail')
const crudAPI=require('./apis')
app.use(basicAuth({
    users: { [Auth_name]: Auth_pass }
}))

app.use('/auth',authAPI)
app.use('/verification',mailAPI)
app.use('/api',crudAPI)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });