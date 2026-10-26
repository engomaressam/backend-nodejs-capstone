const express = require('express')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { body, header, validationResult } = require('express-validator')
const connectToDatabase = require('../models/db')
const logger = require('../logger')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_LIFETIME = '12h'

function signToken (userId) {
  return jwt.sign({ user: { id: userId } }, JWT_SECRET, { expiresIn: TOKEN_LIFETIME })
}

// Reject the request with 400 if express-validator found problems
function checkValidation (req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    logger.error('Validation errors in request', errors.array())
    res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() })
    return false
  }
  return true
}

// Verify the Bearer token sent by the client
function authenticate (req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Authentication token missing' })
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET).user
    next()
  } catch (e) {
    logger.error('Invalid authentication token')
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Register a new user
router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().optional(),
  body('email').trim().isEmail().withMessage('A valid email is required').toLowerCase(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  if (!checkValidation(req, res)) return
  try {
    // Task 1: Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`.
    const db = await connectToDatabase()
    // Task 2: Access MongoDB `users` collection
    const collection = db.collection('users')
    // Task 3: Check if user credentials already exists in the database and throw an error if they do
    const { firstName, lastName, email, password } = req.body
    const existingEmail = await collection.findOne({ email })
    if (existingEmail) {
      logger.error('Email id already exists')
      return res.status(400).json({ error: 'Email id already exists' })
    }
    // Task 4: Create a hash to encrypt the password so that it is not readable in the database
    const salt = await bcryptjs.genSalt(10)
    const hash = await bcryptjs.hash(password, salt)
    // Task 5: Insert the user into the database
    const newUser = await collection.insertOne({
      email,
      firstName,
      lastName: lastName || '',
      password: hash,
      createdAt: new Date()
    })
    // Task 6: Create JWT authentication if passwords match with user._id as payload
    const authtoken = signToken(newUser.insertedId.toString())
    // Task 7: Log the successful registration using the logger
    logger.info('User registered successfully')
    // Task 8: Return the user email and the token as a JSON
    res.json({ authtoken, email })
  } catch (e) {
    logger.error(e)
    return res.status(500).send('Internal server error')
  }
})

// Log in an existing user
router.post('/login', [
  body('email').trim().isEmail().withMessage('A valid email is required').toLowerCase(),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  if (!checkValidation(req, res)) return
  try {
    // Task 1: Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`.
    const db = await connectToDatabase()
    // Task 2: Access MongoDB `users` collection
    const collection = db.collection('users')
    // Task 3: Check for user credentials in database
    const theUser = await collection.findOne({ email: req.body.email })
    // Task 4: Check if the password matches the encrypted password and send an appropriate message on mismatch
    const passwordMatches = theUser ? await bcryptjs.compare(req.body.password, theUser.password) : false
    if (!passwordMatches) {
      logger.error('Login failed: wrong email or password')
      return res.status(401).json({ error: 'Wrong email or password' })
    }
    // Task 5: Fetch user details from a database
    const userName = theUser.firstName
    const userEmail = theUser.email
    // Task 6: Create JWT authentication if passwords match with user._id as payload
    const authtoken = signToken(theUser._id.toString())
    logger.info('User logged in successfully')
    res.json({ authtoken, userName, userEmail })
  } catch (e) {
    logger.error(e)
    return res.status(500).send('Internal server error')
  }
})

// Update the logged-in user's profile
router.put('/update', authenticate, [
  header('email').trim().isEmail().withMessage('Email header is required').toLowerCase(),
  body('name').trim().notEmpty().withMessage('Name is required')
], async (req, res) => {
  // Task 2: Validate the input using `validationResult` and return an appropriate message if you detect an error
  if (!checkValidation(req, res)) return
  try {
    // Task 3: Check if `email` is present in the header and throw an appropriate error message if it is not present
    const email = req.headers.email
    // Task 4: Connect to MongoDB
    const db = await connectToDatabase()
    const collection = db.collection('users')
    // Task 5: Find the user credentials in database
    const existingUser = await collection.findOne({ email })
    if (!existingUser) {
      logger.error('User not found')
      return res.status(404).json({ error: 'User not found' })
    }
    if (existingUser._id.toString() !== req.user.id) {
      logger.error('Token does not belong to this user')
      return res.status(403).json({ error: 'Not allowed to update this user' })
    }
    // Task 6: Update the user credentials in the database
    const updatedUser = await collection.findOneAndUpdate(
      { email },
      { $set: { firstName: req.body.name, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    // Task 7: Create JWT authentication with `user._id` as a payload using the secret key from the .env file
    const authtoken = signToken(updatedUser._id.toString())
    logger.info('User updated successfully')
    res.json({ authtoken, userName: updatedUser.firstName, userEmail: updatedUser.email })
  } catch (e) {
    logger.error(e)
    return res.status(500).send('Internal server error')
  }
})

module.exports = router
