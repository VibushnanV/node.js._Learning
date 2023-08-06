require('dotenv').config()
const express=require('express')
const app=express()
const bodyparser=require('body-parser')
const cors=require('cors')
const joi=require('joi')
const basicAuth = require('express-basic-auth')
const MongoClient=require('mongodb').MongoClient
const url =process.env.DB_URL
app.use(bodyparser.json({}))
app.use(bodyparser.urlencoded({
    extended:true
}))
app.use(cors({origin:true}))
const Auth_name=process.env.BASIC_AUTH_NAME
const Auth_pass=process.env.BASIC_AUTH_PASSWORD
app.use(basicAuth({
    // users: {
    //     'learner247@admin.com':'SVusimbiu1223AN'
    // }
    users: { [Auth_name]: Auth_pass }
    
}))
const PORT=process.env.PORT||8080

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
app.listen(Number(PORT),()=>{console.log('server is created at',Number(PORT))})