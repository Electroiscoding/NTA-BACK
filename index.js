import express from 'express'
import dotenv from 'dotenv'
dotenv.config()
import cors from 'cors'

// Import database configuration AFTER dotenv.config()
import { pool } from './config/db.js'
import UserRoutes from './routes/UserRoutes.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors({
    origin:'*' ,
    method :[ 'PUT' , 'GET' , 'POST' , 'DELETE' , 'OPTIONS' ] ,
    credentials: true 
}))

// Test connection
pool.connect() 
    .then(() => console.log('Connected to Neon Postgres '))
    .catch(err => console.error("Neon Connection Error:", err));

app.use('/api', UserRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})