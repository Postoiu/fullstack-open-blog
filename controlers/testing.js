const testingRoute = require('express').Router()
const Blog = require('../models/blog')
const Users = require('../models/user')

testingRoute.post('/reset', async (request, response) => {
  await Blog.deleteMany({})
  await Users.deleteMany({})

  response.status(204).end()
})

module.exports = testingRoute