require('dotenv').config()
const express=require('express')
const app=express.Router()
const joi=require('joi')
const bcrypt=require('bcrypt')
const MongoClient=require('mongodb').MongoClient
const url =process.env.DB_URL
const crypto=require('crypto-js')
const { reject } = require('bcrypt/promises')
const authenticationSecretKey = process.env.AUTH_SECRET_KEY
const millisecondsInOneHr = 1 * 60 * 60 * 1000
let dbRef=undefined
app.post('/createUser',(req,res)=>{
    return new Promise(async(resolve,reject)=>{
    // let validationSchema=joi.object({
    //     name:joi.string().required().min(3).max(40),
    //     password:joi.string().required().max(15).min(8),
    //     email:joi.string().required().email(),
    // })
    let body=decryptText(req.body.encrypted,authenticationSecretKey)
    // const{error,value}=validationSchema.validate(body)
    if(!body.email || !body.password || !body.name){
        resolve({message:'Invalid Details'})
    }
    else{
        if(body.email.split('@')[0].length<3){
            resolve({message:'email id is invalid'})
        }
        else{
            let filteredData=[]
            let getQuery={
                collection:"users",
                queryParam:{email:body.email}
            }
            await getData(getQuery).then((result)=>{
               filteredData=result['data']
               if(filteredData.length){
                resolve({message:'Email ID already registered'})
               }
               else{
                bcrypt.hash(body.password,10,async(err,hash)=>{
                    body.password=hash
                     let setQueryParam={
                        collection:'users',
                        method:'insert',
                        data:body
                     }
                     await updateData(setQueryParam).then((result)=>{
                         resolve({status:"success",message:result.updatedId})
                     }).catch((err)=>{
                        console.log(err)
                        resolve({message:err})
                     })

                  },(err)=>{
                    console.log(err)
                  })   
               }

            }).catch((err)=>{
                console.log(err)
                resolve({status:"failure",message:err})
            })        
        }
    }
}).then((response)=>{
    res.send({encrypted:encryptText(response,authenticationSecretKey)})
}) .catch((err)=>{
    res.send(encryptText(err))
}) 
})
app.post('/login',(req,res)=>{
return new Promise(async(resolve,reject)=>{
    let validationSchema=joi.object({
        email:joi.string().email().required(),
        password:joi.string().required().min(8).max(15)
    })
    let body=decryptText(req.body.encrypted,authenticationSecretKey)
    const {error,value}=validationSchema.validate(body)
    if(error){
        resolve({message:'Invalid Username or Password',status:'failure'})
    }
    else{
        let getQuery={
            collection:"users",
            queryParam:{email:body.email}
        }
        let data=[]
        await getData(getQuery).catch((err)=>{
            console.log(err)
        }).then((result)=>{
           data=result['data']
        })
        if(data.length){
        bcrypt.compare(body.password,data[0].password,(err,result)=>{
            if(err){
                throw err
            }
            else if(result){
             resolve({message:'Logged in Successfully',data:data,status:'success'})
            }
            else{
                resolve({message:'Password is Incorrect',status:'failure'})
            }
        })
    }
    else{
        resolve({message:'User not Found',status:'failure'})
    } 

    }
           
}).then((response)=>{
    res.send({encrypted:encryptText(response,authenticationSecretKey)})
}) .catch((err)=>{
    res.send(err)
}) 
})
app.post('/forgotPassword',(req,res)=>{
    return new Promise(async(resolve,reject)=>{
        let validationSchema=joi.object({
            email:joi.string().email().required(),
            password:joi.string().required().min(8).max(15),
        })
        let body=decryptText(req.body.encrypted,authenticationSecretKey)
        const {error,value}=validationSchema.validate(body)
        if(error){
            resolve({message:'Invalid Username or Password',status:'failure'})
        }
        else{
            let getQuery={
                collection:"users",
                queryParam:{email:body.email}
            }
            let data=[]
            await getData(getQuery).catch((err)=>{
                console.log(err)
            }).then((result)=>{
               data=result['data']
            })
            if(data.length){
                bcrypt.hash(body.password,10,async(err,hash)=>{
                    data[0]['password']=hash
                    let setQueryParam={
                        collection:'users',
                        method:'update',
                        data:{},
                        id:{_id:data[0]['_id']}
                     }
                     setQueryParam['data']={$set:{password: data[0]['password']}}
                     await updateData(setQueryParam).then((result)=>{
                        resolve({status:'success',message:result['updatedId']})
                     }).catch((err)=>{
                        console.log(err)
                        resolve({message:err,status:'failure'})
                     })
                })
        }
        else{
            resolve({message:'User Not Found',status:'failure'})
        }
    }
    }).then((response)=>{
        res.send({encrypted:encryptText(response,authenticationSecretKey)})
    }) .catch((err)=>{
        res.send(err)
    }) 
})
app.post('/changePassword',(req,res)=>{
    return new Promise(async(resolve,reject)=>{
        let validationSchema=joi.object({
            email:joi.string().required(),
            oldPassword:joi.string().required().min(8),
            newPassword:joi.string().required().min(8),
        })
        let body=decryptText(req.body.encrypted,authenticationSecretKey)
        const {error,value}=validationSchema.validate(body)
        if(error){
            resolve({message:'Invalid Username or Password'})
        }
        else{
            let getQuery={
                collection:"users",
                queryParam:{email:body.email}
            }
            if(body.oldPassword==body.newPassword){
                resolve({message:'Old Password and new Password both are same',status:'failure'})
            }
            else{
                let data=[]
                await getData(getQuery).catch((err)=>{
                    console.log(err)
                }).then((result)=>{
                   data=result['data']
                })
                if(data && data.length){
                    bcrypt.compare(body.oldPassword,data[0].password,(err,result)=>{
                        if(err){
                            console.log(err)
                            resolve({message:err,status:'failure'})
                        }
                        else if(result){
                            bcrypt.hash(body.newPassword,10,async(err,hash)=>{
                                data[0]['password']=hash
                                let setQueryParam={
                                    collection:'users',
                                    method:'update',
                                    data:{},
                                    id:{_id:data[0]['_id']}
                                 }
                                 setQueryParam['data']={$set:{password: data[0]['password']}}
                                 await updateData(setQueryParam).then((result)=>{
                                    resolve({status:'success',message:result['updatedId']})
                                 }).catch((err)=>{
                                    console.log(err)
                                    resolve({message:err,status:'failure'})
                                 })
                            })
                        }
                        else{
                            resolve({message:'old Password is Incorrect',status:'failure'})
                        }
                    })
                
                }
                else{
                    resolve({message:'User Not Found',status:'failure'})
                }
            }
          
        }
    }).then((response)=>{
        res.send({encrypted:encryptText(response,authenticationSecretKey)})
    }) .catch((err)=>{
        res.send(err)
    }) 
})
app.post('/deleteUser',(req,res)=>{
    return new Promise(async(resolve,reject)=>{
        const validationSchema=joi.object({
            email:joi.string().required().email()
        })
        let body=decryptText(req.body,authenticationSecretKey)
        const{error,value}=validationSchema.validate(body)
        if(error){
            resolve({message:'Please send a valid parameter',status:'failure'})
        }
        else{
           let getQuery={
            collection:"users",
            queryParam:{email:body.email}
           }
           await getData(getQuery).then(async(result)=>{
             let data=result['data']
             if(data && data.length){
                  let deleteQuery={
                    collection:'users',
                    method:'delete',
                    id:{_id:data[0]['_id']}
                  }
                  await updateData(deleteQuery).catch((err)=>{
                    console.log(err)
            }).then((response)=>{
                resolve({status:"success",message:"User has been deleted successfully"})  
            })
             }
             else{
                resolve({message:'No user found',status:'failure'})
             }
           }).catch((err)=>{
            console.log(err)
            resolve({message:'Something went wrong',status:'failure'})
           })
        }
    }).then((response)=>{
        res.send({encrypted:encryptText(response,authenticationSecretKey)})
    }) .catch((err)=>{
        res.send(err)
    }) 
})
function getData(param){
    return new Promise(async(resolve,reject)=>{
        !dbRef? await connetToDB():0
        if(!dbRef){
            reject({message:'Connection Failed',status:"failure"}) 
        }
     else{
                        let docRef
                        let collection=param.collection
                        let queryParam=param.queryParam
                        let sortFiled=param.sort
                        let docCount=param.limit
                      const db=dbRef.db('myDB')
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
                                resolve({status:'success',data:result})
                            }
                        })
                    
                      }else{
                        // client.close()
                        reject({status:"failure",message:"Missing collection Name"})
                      }
            }
    })
}

function updateData(param){
    return new Promise(async(resolve,reject)=>{
        !dbRef?await connetToDB():0
        if(!dbRef){
            reject({message:'Connection Failed',status:"failure"}) 
        }
            else{
                const db=dbRef.db('myDB')
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
}
function encryptText(text,password) {
    const encrypted = crypto.AES.encrypt(JSON.stringify(text), password).toString()
    return encrypted
}
function decryptText(text,password) {
    const decrypted = crypto.AES.decrypt(text, password);
    const decryptedText = decrypted.toString(crypto.enc.Utf8);
    return JSON.parse(decryptedText);
} 
 async function connetToDB(){
    return new Promise(async(resolve,reject)=>{
        await MongoClient.connect(url).catch((err)=>{
            dbRef=undefined
            resolve({dbRef})
          
        })
        .then((client)=>{
           dbRef=client
           resolve({dbRef})
        })
    })

}
setTimeout(()=>{
    dbRef=undefined
},millisecondsInOneHr)
// app.listen((PORT),()=>{console.log('server is created')})
module.exports=app