const _ = require('lodash')

const dummy = (blogs) => {
  return 1;
}

const totalLikes = (blogs) => {
  return blogs.reduce((sum, cur) => sum + cur.likes, 0)
}

const favoriteBlog = (blogs) => {
  const sanitizedArray = blogs.map(({ title, author, likes }) => {
    return {
      title,
      author,
      likes
    }
  })

  return sanitizedArray.reduce((acc, cur) => acc.likes > cur.likes ? acc : cur)
}

const mostBlogs = (blogs) => {
  const transformedArray = _.map(_.groupBy(blogs, 'author'), (value, key) => ({ author: key, blogs: value.length }))
  return _.reduce(transformedArray, (acc, cur) => acc.blogs > cur.blogs ? acc : cur)
}

const mostLikes = (blogs) => {
  const transformedArray = _.map(_.groupBy(blogs, 'author'), (value, key) => ({
    author: key,
    likes: _.sumBy(value, 'likes')
  }))

  return _.reduce(transformedArray, (acc, cur) => acc.likes > cur.likes ? acc : cur)
}

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes
}