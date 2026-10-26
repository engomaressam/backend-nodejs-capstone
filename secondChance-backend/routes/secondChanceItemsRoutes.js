const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const connectToDatabase = require('../models/db')
const logger = require('../logger')

const COLLECTION = process.env.MONGO_COLLECTION || 'secondChanceItems'

// Define the upload directory path
const directoryPath = path.join(__dirname, '..', 'public', 'images')
fs.mkdirSync(directoryPath, { recursive: true })

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath) // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, path.basename(file.originalname)) // Use the original file name, without any client-supplied path
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    cb(null, /^image\//.test(file.mimetype))
  }
})

// Atomically hand out the next numeric item id, so concurrent POSTs never get the same id.
async function nextItemId (db) {
  const counters = db.collection('counters')
  const counter = await counters.findOne({ _id: COLLECTION })
  if (!counter) {
    const items = await db.collection(COLLECTION).find({}, { projection: { id: 1 } }).toArray()
    const maxId = items.reduce((max, item) => Math.max(max, parseInt(item.id, 10) || 0), 0)
    try {
      await counters.updateOne({ _id: COLLECTION }, { $max: { seq: maxId } }, { upsert: true })
    } catch (e) {
      if (e.code !== 11000) throw e // another request created the counter first
    }
  }
  const updated = await counters.findOneAndUpdate(
    { _id: COLLECTION },
    { $inc: { seq: 1 } },
    { returnDocument: 'after' }
  )
  return String(updated.seq)
}

function toNumber (value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

// Get all secondChanceItems
router.get('/', async (req, res, next) => {
  logger.info('/ called')
  try {
    // Step 2: task 1 - connect to MongoDB and store the connection in db
    const db = await connectToDatabase()
    // Step 2: task 2 - use the collection() method to retrieve the secondChanceItems collection
    const collection = db.collection(COLLECTION)
    // Step 2: task 3 - fetch all secondChanceItems using collection.find()
    const secondChanceItems = await collection.find({}).toArray()
    // Step 2: task 4 - return the secondChanceItems as JSON
    res.json(secondChanceItems)
  } catch (e) {
    logger.error('oops something went wrong', e)
    next(e)
  }
})

// Add a new item
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    // Step 3: task 1 - connect to MongoDB
    const db = await connectToDatabase()
    // Step 3: task 2 - retrieve the secondChanceItems collection
    const collection = db.collection(COLLECTION)
    // Step 3: task 3 - create a new secondChanceItem from the request body
    const ageDays = toNumber(req.body.age_days)
    const secondChanceItem = {
      name: req.body.name,
      category: req.body.category,
      condition: req.body.condition,
      posted_by: req.body.posted_by,
      zipcode: req.body.zipcode,
      age_days: ageDays,
      age_years: toNumber(req.body.age_years, Number((ageDays / 365).toFixed(1))),
      description: req.body.description,
      image: req.file ? `/images/${req.file.filename}` : req.body.image,
      comments: []
    }
    if (!secondChanceItem.name) {
      return res.status(400).json({ error: 'Item name is required' })
    }
    // Step 3: task 4 - get the next id and the date_added
    secondChanceItem.id = await nextItemId(db)
    secondChanceItem.date_added = Math.floor(Date.now() / 1000)
    // Step 3: task 5 - add the secondChanceItem to the database (the file was uploaded by upload.single('file'))
    await collection.insertOne(secondChanceItem)
    logger.info(`Item ${secondChanceItem.id} added`)
    res.status(201).json(secondChanceItem)
  } catch (e) {
    next(e)
  }
})

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
  try {
    // Step 4: task 1 - connect to MongoDB
    const db = await connectToDatabase()
    // Step 4: task 2 - retrieve the secondChanceItems collection
    const collection = db.collection(COLLECTION)
    // Step 4: task 3 - find the item by its id
    const secondChanceItem = await collection.findOne({ id: req.params.id })
    // Step 4: task 4 - return the item, or 404 if it does not exist
    if (!secondChanceItem) {
      return res.status(404).json({ error: 'secondChanceItem not found' })
    }
    res.json(secondChanceItem)
  } catch (e) {
    next(e)
  }
})

// Update an existing item
router.put('/:id', async (req, res, next) => {
  try {
    // Step 5: task 1 - connect to MongoDB
    const db = await connectToDatabase()
    // Step 5: task 2 - retrieve the secondChanceItems collection
    const collection = db.collection(COLLECTION)
    // Step 5: task 3 - check that the item exists
    const id = req.params.id
    const secondChanceItem = await collection.findOne({ id })
    if (!secondChanceItem) {
      logger.error('secondChanceItem not found')
      return res.status(404).json({ error: 'secondChanceItem not found' })
    }
    // Step 5: task 4 - update the item's fields
    const changes = { updatedAt: new Date() }
    for (const field of ['name', 'category', 'condition', 'description', 'zipcode']) {
      if (req.body[field] !== undefined) changes[field] = req.body[field]
    }
    if (req.body.age_days !== undefined) {
      changes.age_days = toNumber(req.body.age_days)
      changes.age_years = Number((changes.age_days / 365).toFixed(1))
    }
    const updated = await collection.findOneAndUpdate(
      { id },
      { $set: changes },
      { returnDocument: 'after' }
    )
    // Step 5: task 5 - send a confirmation
    if (updated) {
      res.json({ uploaded: 'success' })
    } else {
      res.json({ uploaded: 'failed' })
    }
  } catch (e) {
    next(e)
  }
})

// Delete an existing item
router.delete('/:id', async (req, res, next) => {
  try {
    // Step 6: task 1 - connect to MongoDB
    const db = await connectToDatabase()
    // Step 6: task 2 - retrieve the secondChanceItems collection
    const collection = db.collection(COLLECTION)
    // Step 6: task 3 - find the item, return 404 if it does not exist
    const id = req.params.id
    const secondChanceItem = await collection.findOne({ id })
    if (!secondChanceItem) {
      logger.error('secondChanceItem not found')
      return res.status(404).json({ error: 'secondChanceItem not found' })
    }
    // Step 6: task 4 - delete the item and send a confirmation
    await collection.deleteOne({ id })
    res.json({ deleted: 'success' })
  } catch (e) {
    next(e)
  }
})

module.exports = router
