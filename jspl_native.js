const express=require('express')
const app=express()
const bodyparser=require('body-parser')
const cors=require('cors')
const joi=require('joi')
const bcrypt=require('bcrypt')
const MongoClient=require('mongodb').MongoClient
const url = "mongodb://localhost:27017"
app.use(bodyparser.json({}))
app.use(bodyparser.urlencoded({
    extended:true
}))
app.use(cors({origin:true}))

app.post('/createUser',(req,res)=>{
    return new Promise(async(resolve,reject)=>{
    let validationSchema=joi.object({
        name:joi.string().required().min(3).max(40),
        password:joi.string().required().max(15).min(8),
        email:joi.string().required().email()
    })
    let body=req.body
    const{error,value}=validationSchema.validate(body)
    console.log(error,'error')
    if(error){
        reject({message:'Invalid Details'})
    }
    else{
        if(body.email.split('@')[0].length<3){
            reject({message:'email id is invalid'})
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
                reject({message:'Email ID already registered'})
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
                        reject({message:err})
                     })

                  },(err)=>{
                    console.log(err)
                  })   
               }

            }).catch((err)=>{
                console.log(err)
                reject({status:"failure",message:err})
            })        
        }
    }
}).then((response)=>{
    res.send(response)
}) .catch((err)=>{
    res.send(err)
}) 
})
app.post('/login',(req,res)=>{
return new Promise(async(resolve,reject)=>{
    let validationSchema=joi.object({
        email:joi.string().email().required(),
        password:joi.string().required().min(8).max(15)
    })
    let body=req.body
    const {error,value}=validationSchema.validate(body)
    if(error){
        reject({message:'Invalid Username or Password'})
    }
    else{
        let currentUser=[]
        let getQuery={
            collection:"users",
        }
        let data=[]
        await getData(getQuery).catch((err)=>{
            console.log(err)
        }).then((result)=>{
           data=result['data']
        })
        if(data.length){
      currentUser = data.filter((doc)=>{
        return doc.email==body.email
      })
      if(currentUser.length){
        bcrypt.compare(body.password,currentUser[0].password,(err,result)=>{
            if(err){
                throw err
            }
            else if(result){
             resolve({message:'Logged in Successfully'})
            }
            else{
                reject({message:'Password is Incorrect'})
            }
        })
    }
    else{
               reject({message:'User not Found'})
    } 
}
    }
           
}).then((response)=>{
    res.send(response)
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
        let body=req.body
        const {error,value}=validationSchema.validate(body)
        if(error){
            reject({message:'Invalid Username or Password'})
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
                        reject({message:err})
                     })
                })
        }
        else{
            reject({message:'User Not Found'})
        }
    }
    }).then((message)=>{
        res.send(message)
    }).catch((message)=>{
        res.send(message)
    })
})
app.post('/changePassword',(req,res)=>{
    return new Promise(async(resolve,reject)=>{
        let validationSchema=joi.object({
            email:joi.string().required(),
            oldPassword:joi.string().required().min(8),
            newPassword:joi.string().required().min(8),
        })
        let body=req.body
        const {error,value}=validationSchema.validate(value)
        if(error){
            reject({message:'Invalid Username or Password'})
        }
        else{
            let getQuery={
                collection:"users",
                queryParam:{email:body.email}
            }
            if(body.oldPassword==body.newPassword){
                reject({message:'Old Password and new Password both are same'})
            }
            else{
                let data=[]
                await getData(getQuery).catch((err)=>{
                    console.log(err)
                }).then((result)=>{
                   data=result['data']
                })
                if(data && data.length){
                    bcrypt.hash(body.newPassword,10,async(err,hash)=>{
                        data[0]['password']=hash
                        let setQueryParam={
                            collection:'users',
                            method:'update',
                            data:{},
                            id:{_id:data[0]['_id']}
                         }
                         setQueryParam['data']={$set:{password: data[0]['newPassword']}}
                         await updateData(setQueryParam).then((result)=>{
                            resolve({status:'success',message:result['updatedId']})
                         }).catch((err)=>{
                            console.log(err)
                            reject({message:err})
                         })
                    }) 
                }
                else{
                    reject({message:'User Not Found'})
                }
            }
          
        }
    }).catch((err)=>{
        console.log(err)
        res.send(message)
    }).then((response)=>{
        res.send(response)
    })
})

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
              const db=client.db('myDB')
              if(collection){
                docRef=db.collection(collection)
                if(queryParam){
                   docRef=docRef.find(queryParam)
                }
                else{
                    docRef=docRef.find({})
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

app.listen((8080),()=>{console.log('server is created')})
