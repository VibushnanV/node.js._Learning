const mongoClient = require('mongodb').MongoClient
const url = "mongodb://localhost:27017/myDB"
mongoClient.connect(url, async(err, client) => {
    if (err) {
        throw new err
    }
    else {
        console.log('connection Established')
        var db = client.db('myDB')
        //  db.createCollection('users')
        let user = [{ name: 'Vibushnan', email: 'Vibushnan@gmail.com', DOB: "23/05/2001", age: 21 },
        { name: 'westly', email: 'westly@gmail.com', DOB: "23/03/2001", age: 21 },
        { name: 'Vishnu', email: 'Vishnu@gmail.com', DOB: "23/02/2001", age: 21 }]
        // console.log(`Collection Created`)
        // await db.collection('users').insertOne(user, (err, result) => {
        //     if (err) {
        //         throw new err
        //     }
        //     else {
        //         console.log(`Document Inserted ${result}`)
        //         client.close()
        //     }
        // })
        //  await db.collection('users').insertMany(user, (err, result) => {
        //     if (err) {
        //         throw new err
        //     }
        //     else {
        //         console.log(`Document Inserted ${result}`)
        //     }
        // })
        // await db.collection('users').findOne({},{projection:{age:0}},(err,result)=>{
        //     if(err) throw err
        //     else{
        //          console.log(result)
        //     }
        //  })
        // await db.collection('users').updateOne({name:'Vibushnan'},{$set:{DOB:"23/05/2001"}},(err,response)=>{
        //     if(err) throw err
        //     else{
        //         console.log(`Successfully Updated ${response}`)
        //     }
        // })
        // await db.collection('users').deleteOne({name:"Vibushnan"},(err,result)=>{
        //     if(err) throw err
        //     else{
        //         console.log(`Successfully Deleted`)
        //     }
        // })
        //   await db.collection('users').findOne({},{sort:{name:-1}},((err,res)=>{
        //     if(err) throw err
        //     else{
        //         console.log(res)
        //     }
        //   }))
    
          await db.collection('users').find({},{sort:{name:-1}}).toArray((err,res)=>{
            if(err) throw err
            else{
                console.log(res)
                client.close() 
            }
          })
      
        }
    
})

