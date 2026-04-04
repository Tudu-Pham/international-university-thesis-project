import express from "express";
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 3000

//Routes
app.get('/', (req, res) => {
    res.send('Hello World! ok')
})

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
})
