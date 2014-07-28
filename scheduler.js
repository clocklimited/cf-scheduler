module.exports = Scheduler

var log = console.log.bind(console)

function Scheduler(collection, logger) {
  if (!collection) throw new Error('Scheduler requires a `save` collection')
  this.collection = collection
  this.logger = logger || { debug: log, info: log, warn: log, error: log }
}

/*
 * Schedule a job. Pass a type, a date and some arbitrary data.
 * Returns the created job's `id`.
 */
Scheduler.prototype.schedule = function (type, date, data, cb) {
  if (typeof type !== 'string') return cb(new Error('Job type must be a string'))
  if (!(date instanceof Date)) return cb(new Error('Job date must be a an instance of Date'))
  this.collection.create({ type: type, date: date, data: data, complete: false }, function (err, job) {
    if (err) return cb(err)
    this.logger.info('Job #' + job._id + ' scheduled for ' + job.date)
    cb(null, job._id)
  }.bind(this))
}

/*
 * Update the scheduled `date` for the job with `id`
 */
Scheduler.prototype.reschedule = function (id, date, cb) {
  if (!(date instanceof Date)) return cb(new Error('Job date must be a an instance of Date'))
  this.collection.update({ _id: id, date: date }, function (err, job) {
    if (err) return cb(err)
    this.logger.info('Job #' + job._id + ' rescheduled for ' + job.date)
    cb(null)
  }.bind(this))
}

/*
 * Cancel a job by providing its `id`.
 */
Scheduler.prototype.cancel = function (id, cb) {
  this.collection.delete(id, function (err) {
    if (err) return cb(err)
    this.logger.info('Job #' + id + ' cancelled')
    cb(null)
  }.bind(this))
}

/*
 * Get a list of uncompleted jobs that are due – those whose dates are in the past.
 * `type` is optional and if passed only jobs of that type will be retrieved.
 */
Scheduler.prototype.getDue = function (type, cb) {

  // Create the query object
  var query = { date: { $lt: new Date() } }

  if (typeof type === 'function') {
    // If the first argument is a function, no type was is provided
    cb = type
    type = undefined
  } else {
    // Otherwise set the type on the query
    query.type = type
  }

  this.collection.find(query, function (err, jobs) {
    if (err) return cb(err)
    this.logger.info(jobs.length + ' due jobs found')
    cb(null, jobs)
  }.bind(this))

}

/*
 * Get a list of completed jobs. `type` is optional and if passed only
 * jobs of that type will be retrieved.
 */
Scheduler.prototype.getCompleted = function (type, cb) {

  var query = { complete: true }

  if (typeof type === 'function') {
    // If the first argument is a function, no type was is provided
    cb = type
    type = undefined
  } else {
    // Otherwise set the type on the query
    query.type = type
  }

  this.collection.find(query, function (err, jobs) {
    if (err) return cb(err)
    this.logger.info(jobs.length + ' completed jobs found')
    cb(null, jobs)
  }.bind(this))

}

/*
 * Mark a job as `complete` this means that it will not longer be returned in
 * `getDue()` calls.
 */
Scheduler.prototype.complete = function (id, cb) {
  this.collection.update({ _id: id, complete: true }, function (err, job) {
    if (err) return cb(err)
    this.logger.info('Job #' + job._id + ' marked as complete')
    cb(null)
  }.bind(this))
}

/*
 * Query the collection for jobs based on their associated 'data'
 */
Scheduler.prototype.find = function (type, propertyMatches, cb) {

  var query = {}

  if (typeof propertyMatches === 'function') {
    cb = propertyMatches
    propertyMatches = type
  } else {
    query.type = type
  }

  Object.keys(propertyMatches).forEach(function (key) {
    query['data.' + key] = propertyMatches[key]
  })

  this.collection.find(query, function (err, jobs) {
    if (err) return cb(err)
    this.logger.info(jobs.length + ' jobs found for query ' + JSON.stringify(query))
    cb(null, jobs)
  }.bind(this))

}
