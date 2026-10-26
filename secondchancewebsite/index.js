// Serves the SecondChance landing page and the built React app, and forwards
// API calls and item images to the back end so the browser only talks to one origin.
const path = require('path')
const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()
const port = process.env.PORT || 9000
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3060'
const buildDir = path.join(__dirname, 'build')

app.use(createProxyMiddleware({
  target: backendUrl,
  changeOrigin: true,
  pathFilter: ['/api', '/images']
}))

// Landing page with the Get Started button
app.get(['/', '/home.html'], (req, res) => {
  res.sendFile(path.join(buildDir, 'home.html'))
})

app.use(express.static(buildDir, { index: false }))

// React app (client-side routes under /app)
app.get(['/app', '/app/*'], (req, res) => {
  res.sendFile(path.join(buildDir, 'index.html'))
})

app.listen(port, () => {
  console.log(`SecondChance website running on port ${port}, API calls go to ${backendUrl}`)
})
