require('dotenv').config()
const express=require('express')
const app=express.Router()
const joi=require('joi')
const MongoClient=require('mongodb').MongoClient
const url =process.env.DB_URL
const webPush=require('web-push')
const millisecondsInOneHr = 1 * 60 * 60 * 1000
let dbRef=undefined
const getSchema = joi.object({
    collection: joi.string().min(1).required(),
    queryParam: joi.object().optional(),
    sort: joi.object().optional(),
    limit: joi.number().optional()
});
app.post('/getData',(req,res)=>{
    return new Promise(async(resolve,reject)=>{
         const{error,value}=getSchema.validate(req.body)
         if(error){
            console.log(error)
            resolve({status:'failure',message:'Please send valid parameters'})
        }
        else{
            await getData(req.body).catch((err)=>{
                console.log(err)
                resolve({status:'failure',message:err})
            }).then(async(result)=>{
                resolve(result)
            })
        }
    }).then((response)=>{
        res.send(response)
    })  
})
const insertSchema = joi.object({
    collection: joi.string().min(1).required(),
    data: joi.object().required(),
});
app.post('/insertData',(req,res)=>{
    return new Promise(async(resolve,reject)=>{
         const{error,value}=insertSchema.validate(req.body)
         if(error){
            console.log(error)
            resolve({status:'failure',message:'Please send valid parameters'})
        }
        else{
            let insertParam={...req.body,...{method:"insert"}}
            await updateData(insertParam).catch((err)=>{
                console.log(err)
                resolve({status:'failure',message:err})
            }).then(async(result)=>{
                resolve(result)
            })
        }
    }).then((response)=>{
        res.send(response)
    })  
})

const updateSchema = joi.object({
    collection: joi.string().min(1).required(),
    data: joi.object().required(),
    id:joi.string().required()
});
app.post('/updateData',(req,res)=>{
    return new Promise(async(resolve,reject)=>{
         const{error,value}=updateSchema.validate(req.body)
         if(error){
            console.log(error)
            resolve({status:'failure',message:'Please send valid parameters'})
        }
        else{
            let updateParam={...req.body,...{method:"update"}}
            await updateData(updateParam).catch((err)=>{
                console.log(err)
                resolve({status:'failure',message:err})
            }).then(async(result)=>{
                resolve(result)
            })
        }
    }).then((response)=>{
        res.send(response)
    })  
})
const deleteSchema = joi.object({
    collection: joi.string().min(1).required(),
    id:joi.string().required()
});
app.post('/deleteData',(req,res)=>{
    return new Promise(async(resolve,reject)=>{
         const{error,value}=deleteSchema.validate(req.body)
         if(error){
            console.log(error)
            resolve({status:'failure',message:'Please send valid parameters'})
        }
        else{
            let updateParam={...req.body,...{method:"delete"}}
            await updateData(updateParam).catch((err)=>{
                console.log(err)
                resolve({status:'failure',message:err})
            }).then(async(result)=>{
                resolve(result)
            })
        }
    }).then((response)=>{
        res.send(response)
    })  
})
const pushscriptionSchema = joi.object({
    collection: joi.string().min(1).required(),
    subscription: joi.object().required(),
    details:joi.object().required()
});
app.post('/addSubscribers',(req,res)=>{
    return new Promise(async(resolve,reject)=>{
         const{error,value}=pushscriptionSchema.validate(req.body)
         if(error){
            console.log(error)
            resolve({status:'failure',message:'Please send valid parameters'})
        }
        else{
            let dataToadd={collection:req.body.collection,data:{...req.body.subscription,...req.body.details}}
            let insertParam={...dataToadd,...{method:"insert"}}
            await updateData(insertParam).catch((err)=>{
                console.log(err)
                resolve({status:'failure',message:err})
            }).then(async(result)=>{
                resolve(result)
            })
        }
    }).then((response)=>{
        res.send(response)
    })  
})

const notificationSchema = joi.object({
    email: joi.string().email().required(),
    payload:joi.object().required()
});
app.post('/sendNotification',(req,res)=>{
    return new Promise(async(resolve,reject)=>{
        webPush.setVapidDetails(
            'mailto: vibushvs@gmail.com',
            process.env.PUBLIC_VAPID_KEY,
            process.env.PRIVATE_VAPID_KEY 
        )
        const{error,value}=notificationSchema.validate(req.body)
        if(error){
           console.log(error)
           resolve({status:'failure',message:'Please send valid parameters'})
       }
       else{
        let body=req.body
        let subscriptionQuery={
            collection:"Push_Subscriptions",
            queryParam:{email:body.email}
        }
        await getData(subscriptionQuery).catch((err)=>{
            console.log(err)
            resolve({status:'failure',message:err})
        }).then(async(result)=>{
            if(result['status']=='success' && result['data'].length){
                let subscriptions=result['data']
             let notificationResults=  await Promise.allSettled(subscriptions.map((sub)=>{
                     webPush.sendNotification(sub,JSON.stringify(body.payload)).catch((err)=>{
                        console.log(err)
                     })
                }))
                for(let [index,value] of notificationResults.entries()){
                    if (value.status == "fulfilled") {
                        resolve({status:"success",message:"Notification sent"})
                    }
                    else{
                        resolve({status:"failure",message:`Failed`})
                    }
                }
            
            }
            else{
                resolve({status:"failure",message:"User is not subscribed for push notication"})
            }
        })
       }
    }).then((response)=>{
        res.send(response)
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
module.exports=app
// app.listen(Number(PORT),()=>{console.log('server is created at',Number(PORT))})