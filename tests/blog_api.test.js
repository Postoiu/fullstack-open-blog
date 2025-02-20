const { test, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const helper = require('./test_helper')
const app = require('../app')
const api = supertest(app)

const Blog = require('../models/blog')

beforeEach(async () => {
  await Blog.deleteMany({})

  const blogObjects = helper.initialBlogs.map(blog => new Blog(blog))
  const promiseArray = blogObjects.map(blog => blog.save())
  await Promise.all(promiseArray)
})

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

test('a valid blog post can be added', async () => {
  const newBlog = {
    title: 'Test Title',
    author: 'Test Author',
    url: 'http://test-url.com',
    likes: 33
  }

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const response = await api.get('/api/blogs')
  assert.strictEqual(response.body.length, helper.initialBlogs.length + 1)

  const titles = response.body.map(blog => blog.title)
  assert(titles.includes('Test Title'))
})

test('likes property missing', async () => {
  const newBlog = {
    title: 'Test Title',
    author: 'Test Author',
    url: 'http://test-url.com'
  }

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const response = await api.get('/api/blogs')
  const addedBlog = response.body.find(blog => blog.title === 'Test Title')

  assert(Object.keys(addedBlog).includes('likes'))
  assert.strictEqual(addedBlog.likes, 0)
})

test('title and url missing', async () => {
  const newBlog = {
    author: 'Test Author',
  }

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(400)

    const response = await api.get('/api/blogs')
    assert.strictEqual(response.body.length, helper.initialBlogs.length)
})

after(async () => {
  await mongoose.connection.close()
})