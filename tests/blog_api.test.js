const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const bcrypt = require('bcrypt')
const helper = require('./test_helper')
const app = require('../app')
const api = supertest(app)

const Blog = require('../models/blog')
const User = require('../models/user')

beforeEach(async () => {
  await Blog.deleteMany({})
  await User.deleteMany({})

  const passwordHash = await bcrypt.hash('secret', 10)
  const blogIds = helper.initialBlogs.map(b => b._id)

  const newUser = new User({
    _id: '67bc84091af0a50481ba28e1',
    username: 'mluukkai',
    name: 'Matti Luukkainen',
    blogs: blogIds,
    passwordHash
  })

  await newUser.save()

  const blogObjects = helper.initialBlogs.map(blog => new Blog(blog))
  const promiseArray = blogObjects.map(blog => blog.save())
  await Promise.all(promiseArray)
})

describe('read operation on database', async () => {
  test('blogs returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('count the amount of blogs', async () => {
    const response = await api.get('/api/blogs')
  
    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })

  test('unique identifier property is name id', async () => {
    const response = await api.get('/api/blogs')
  
    assert(Object.keys(response.body[0]).includes('id'))
  })
})

describe('update database operations', async () => {
  test('a valid blog post can be added', async () => {
    const user = await User.findOne({ username: 'mluukkai' })
    const token = helper.getToken(user)

    const newBlog = {
      title: 'Test Title',
      author: 'Test Author',
      url: 'http://test-url.com',
      likes: 33
    }
  
    await api
      .post('/api/blogs')
      .set('Authorization', 'Bearer ' + token)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)
  
    const response = await api.get('/api/blogs')
    assert.strictEqual(response.body.length, helper.initialBlogs.length + 1)
  
    const titles = response.body.map(blog => blog.title)
    assert(titles.includes('Test Title'))
  })

  test('update blog with valid data', async () => {
    const blogToUpdate = helper.initialBlogs[0]

    const update = {
      likes: blogToUpdate.likes + 1
    }

    const response = await api
      .put(`/api/blogs/${blogToUpdate._id}`)
      .send(update)
      .expect(200)
      .expect('Content-Type', /application\/json/)
    
    assert.strictEqual(response.body.likes, blogToUpdate.likes + 1)
  })

  test('unauthorized if no token provided', async () => {
    const newBlog = {
      title: 'Test Title',
      author: 'Test Author',
      url: 'http://test-url.com',
      likes: 33
    }
  
    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    const response = await api.get('/api/blogs')
    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })
})

describe('validation and verification', async () => {
  test('likes property missing', async () => {
    const user = await User.findOne({ username: 'mluukkai' })
    const token = helper.getToken(user)

    const newBlog = {
      title: 'Test Title',
      author: 'Test Author',
      url: 'http://test-url.com',
    }
  
    const addedBlog = await api
      .post('/api/blogs')
      .set('Authorization', 'Bearer ' + token)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)
  
    assert(Object.keys(addedBlog.body).includes('likes'))
    assert.strictEqual(addedBlog.body.likes, 0)
  })

  test('title and url missing', async () => {
    const user = await User.findOne({ username: 'mluukkai' })
    const token = helper.getToken(user)

    const newBlog = {
      author: 'Test Author',
    }
  
    await api
      .post('/api/blogs')
      .set('Authorization', 'Bearer ' + token)
      .send(newBlog)
      .expect(400)
  
      const response = await api.get('/api/blogs')
      assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })
})

describe('deletion of a blog post', async () => {
  test('delete with a valid id', async () => {
    const blogToDelete = helper.initialBlogs[0]

    const user = await User.findOne({ username: 'mluukkai' })
    const token = helper.getToken(user)

    await api
      .delete(`/api/blogs/${blogToDelete._id}`)
      .set('Authorization', 'Bearer ' + token)
      .expect(204)

    const response = await api.get('/api/blogs')

    assert.strictEqual(response.body.length, helper.initialBlogs.length - 1)
  })

  test('delete with an invalid id', async () => {
    const invalidId = '783786829302'

    const user = await User.findOne({ username: 'mluukkai' })
    const token = helper.getToken(user)

    await api
      .delete(`/api/blogs/${invalidId}`)
      .set('Authorization', 'Bearer ' + token)
      .expect(400)

    const response = await api.get('/api/blogs')

    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })
})

describe('creating new users', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const salt = 10
    const passwordHash = await bcrypt.hash('secret', salt)

    const user = new User({ username: 'root', passwordHash })
    await user.save()
  })

  test('create a user with valid data', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'test',
      name: 'Test Testson',
      password: 'secretpass'
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

    const usernames = usersAtEnd.map(u => u.username)
    assert(usernames.includes(newUser.username))
  })

  test('do not create a user without a username', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      name: 'Test Testson',
      password: 'secretpass'
    }

    const response = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.error, "User validation failed: username: Path `username` is required.")

    const usersAtEnd = await helper.usersInDb()

    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })

  test('do not create a user with a password length less than 3', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'test',
      name: 'Test Testson',
      password: 'se'
    }

    const response = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.error, "password must be at least 3 characters long")

    const usersAtEnd = await helper.usersInDb()

    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })

  test('do not create a user with the same username', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'root',
      name: 'Test Testson',
      password: 'secret'
    }

    const response = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.error, "username must be unique")

    const usersAtEnd = await helper.usersInDb()

    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })
})

after(async () => {
  await mongoose.connection.close()
})