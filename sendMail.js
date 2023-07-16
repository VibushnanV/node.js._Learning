const nodemailer=require('nodemailer')
const express=require('express')
const app=express()
const  moment=require('moment')
const bodyparser=require('body-parser')
const cors=require('cors')
const bcrypt=require('bcrypt')
const joi=require('joi')
const MongoClient=require('mongodb').MongoClient
const url = "mongodb://localhost:27017"
app.use(bodyparser.json({}))
app.use(bodyparser.urlencoded({
    extended:true
}))
app.use(cors({origin:true}))

app.post('/generateOtp',(req,res)=>{
     return new Promise(async(resolve,reject)=>{
        let validationSchema=joi.object({
            email:joi.string().required().email()
        })
        let body=req.body
        const {error,value}=validationSchema.validate(body)
        if(error){
            console.log(error)
            reject({status:'failure',message:'Invalid Schema'})
        }
        else{
            let getQuery={
                collection:"users",
                queryParam:{email:body.email}
            }
            await getData(getQuery).catch((err)=>{
                console.log(err)
            }).then(async(result)=>{
               data=result['data']
               if(data && data.length){
                let otp = Math.floor(100000 + Math.random() * 900000);
                let otpData={
                    email:body.email,
                    expiresIn:moment().add(30,'minute').toDate(),
                    timestamp:moment().toDate(),
                    otp:otp
                }
                let updateQuery={
                        collection:'verificationOtps',
                        method:'insert',
                        data:otpData
                }
                await updateData(updateQuery).then((result)=>{
                    resolve({status:'success',data:otpData})
                    // const mailOptions = {
                    //     from: '*******************',
                    //     to: body.email,
                    //     subject: 'Email Verification',
                    //     html:`<div><b>${otp}</b><p>is the OTP for your request.</p> </div>
                    //        <div style='margin-top:10px'> This OTP is valid for 30 mins. Do not share this code with anyone</div>
                    //        <div style="margin-top:10px;">Thanks & Regards</div>
                    //        <div>_________________</div>
                    //        <div>NOTE: This is system generated mail. Please don't reply to this email !!</div>
                    //        `
                    //   };
                    //     sendMails(mailOptions).catch(async(err)=>{
                    //          let deleteQuery={
                    //             collection:'verificationOtps',
                    //             method:'delete',
                    //             id:{_id:result['updatedId']}
                    //          }
                    //         await updateData(deleteQuery).catch((err)=>{
                    //             console.log(err)
                    //         })
                    //         reject({status:"failure",message:'Mail sending process is failed'})
                    //     }).then((response)=>{
                    //         resolve(response)
                    //     })
                }).catch((err)=>{
                    console.log(err)
                    reject({status:'failure',message:'Connection Failed'})
                })
               }
               else{
                reject({status:'failure',message:'No user found'})
               }
            }).catch((err)=>{
                console.log(err)
                reject({status:'failure',message:'Connection Failed'})
            })
        
        }
     }).then((result)=>{
        res.status(200).json(result)
     }).catch((err)=>{
        console.log(err)
        res.send(err)
     })
})

app.post('/verifyOtp',(req,res)=>{
    return new Promise(async(resolve,reject)=>{
        let validationSchema=joi.object({
            email:joi.string().required().email(),
            otp:joi.number().required()
        })
        let body=req.body
        const {error,value}=validationSchema.validate(body)
        if(error){
            console.log(error)
            reject({status:'failure',message:'Invalid Schema'})
        }
        else{
            let getQuery={
                collection:"verificationOtps",
                queryParam:{email:body.email},
                sort:{timestamp:-1},
                limit:1
            }
            await getData(getQuery).catch((err)=>{
                console.log(err)
            }).then(async(result)=>{
               let otpData =result['data']
               if(otpData && otpData.length){
                let expiry = moment(otpData[0].expiresIn).valueOf();
                let currentTime = moment().valueOf();
                if(expiry >= currentTime){
                    if(Number(body.otp) == otpData[0].otp){
                                   let deleteQuery={
                                collection:'verificationOtps',
                                method:'delete',
                                id:{_id:otpData[0]['_id']}
                             }
                            await updateData(deleteQuery).catch((err)=>{
                                console.log(err)
                        }).then((response)=>{
                            resolve({status:"success",message:"Email has been verified"})  
                        })
                    }
                    else{
                        reject({status:"failure", message:"Otp is wrong"})
                    }
                }
                else{
                    reject({status:"failure", message:"Otp has been expired"})
                }
               }
               else{
                reject({status:'failure',message:'OTP verification failed'})
               }
            }).catch((err)=>{
                console.log(err)
                reject({status:'failure',message:'Connection Failed'})
            })
        }
    })
    .then((result)=>{
        res.status(200).json(result)
     }).catch((err)=>{
        console.log(err)
        res.send(err)
     })
})
  function sendMails(mailOptions){
    return new Promise(async(resolve,reject)=>{
       let trasporter=nodemailer.createTransport({
    //     host: '*********',
    //    // auth: {
    //     //     user: '*********@gmail.com',
    //     //     pass: '***************'
    //     //   }
    //     tls: {
    //         rejectUnauthorized: false
    //     }
        // host:'************',
        // auth: {
        //     user: '*********@gmail.com',
        //     pass: '***************'
        //   }
       })
      await trasporter.sendMail(mailOptions).then((respose)=>{
           resolve({status:'success',message:'Mail sent',information:respose})
      })
      .catch((err)=>{
        console.log(err,'mail failed')
        reject({status:'failure',message:'Mail sending process is failed'})
      })
    })

  }
function getData(param){
    return new Promise(async(resolve,reject)=>{
        MongoClient.connect(url,(err,client)=>{
            if(err){
                reject({message:err,status:"failure"})
            }
            else{
                let docRef
                let collection=param.collection
                let queryParam=param.queryParam
                let sortFiled=param.sort
                let docCount=param.limit
              const db=client.db('myDB')
              if(collection){
                docRef=db.collection(collection)
                if(queryParam){
                   docRef=docRef.find(queryParam)
                }
                else{
                    docRef=docRef.find({})
                }
                if(sortFiled){
                    docRef=docRef.sort(sortFiled)
                }
                if(docCount){
                    docRef=docRef.limit(docCount)
                }
                docRef.toArray((err,result)=>{
                    if(err){
                        reject({status:"failure",message:err})
                    }
                    else{
                        client.close()
                        resolve({status:'success',data:result})
                    }
                })
            
              }else{
                client.close()
                reject({status:"failure",message:"Missing collection Name"})
              }
            }
            })
    })
}

function updateData(param){
    return new Promise(async(resolve,reject)=>{
        MongoClient.connect(url,(err,client)=>{
            if(err){
                reject({message:err,status:"failure"})
            }
            else{
                const db=client.db('myDB')
                let collection=param.collection
                let dataToUpdate=param.data
                let method=param.method
                let id=param.id
                let docRef
                if(collection){
                docRef= db.collection(collection)
                if(method){
                    if(method=='insert'){
               docRef.insertOne(dataToUpdate).then((res)=>{
                    resolve({status:'success',updatedId:res.insertedId})
                }).catch((err)=>{
                    console.log(err)
                    reject({status:'failure',message:err})
                })
            }
            else if(method=='update'){
               if(id){
                 docRef.updateOne(id,dataToUpdate).then((res)=>{
                    resolve({status:'success',updatedId:res})
                 }).catch((err)=>{
                    reject({status:'failure',message:err})
                 })
               }
               else{
                reject({message:'Document Id is missing'})
               }
            }
            else if(method=='delete'){
                if(id){
                docRef.deleteOne(id)
                .then((res)=>{
                    resolve({status:'success',deletedId:res})
                 }).catch((err)=>{
                    reject({status:'failure',message:err})
                 })
                }else{
                    reject({message:'Document Id is missing'})
                }
            }
            }
            else{
                reject({message:'No method is in param'})
            }
            }
            else{
                reject({message:'Collection Name is missing'})   
            }
        }
        })
    })
}

app.listen((3000),()=>{console.log('server is created')})
