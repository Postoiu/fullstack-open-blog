const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const Users = require('../models/user')

blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
  response.json(blogs)
})

blogsRouter.post('/', async (request, response) => {
  const { title, author, url, likes = 0 } = request.body

  const reqUser = request.user

  if(!reqUser) {
    return response.status(401).json({
      error: 'token invalid'
    })
  }

  const user = await Users.findById(reqUser.id)

  const blog = new Blog({
    title,
    author,
    url,
    likes,
    user: user._id
  })

  
  const savedBlog = await blog.save()
  user.blogs = user.blogs.concat(savedBlog._id)
  await user.save()
  
  response.status(201).json(savedBlog)
})

blogsRouter.delete('/:id', async (request, response) => {
  if(!request.token) {
    return response.status(401).json({
      error: 'invalid token'
    })
  }

  const user = request.user
  const blogToDelete = await Blog.findById(request.params.id)

  if(blogToDelete.user.toString() !== user.id.toString()) {
    return response.status(401).json({
      error: 'not authorized to delete the blog'
    })
  } 

  await Blog.deleteOne({ _id: request.params.id })
  response.status(204).end()
})

blogsRouter.put('/:id', async (request, response) => {
  const body = request.body

  const updatedBlog = await Blog.findByIdAndUpdate(
    request.params.id,
    { ...body },
    { new: true }
  )

  response.json(updatedBlog)
})

module.exports = blogsRouter