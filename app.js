const config = require('./utils/config')
const express = require('express')
require('express-async-errors')
const app = express()
const cors = require('cors')
const morgan = require('morgan')
const blogsRouter = require('./controlers/blog')
const middleware = require('./utils/middleware')
const logger = require('./utils/logger')
const mongoose = require('mongoose')

mongoose.set('strictQuery', false)

logger.info('connecting to', config.MONGODB_URI)

mongoose.connect(config.MONGODB_URI)
  .then(() => logger.info('connected to MongoDB'))
  .catch(err => logger.error('connection to MongoDB failed:', err.message))

morgan.token('body', (request,) => JSON.stringify(request.body))

app.use(cors())
app.use(express.json())
app.use(morgan(middleware.requestLogger, {
  skip: () => process.env.NODE_ENV === 'test'
}))

app.use('/api/blogs', blogsRouter)

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app