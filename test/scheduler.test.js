var assert = require('assert')
  , Scheduler = require('..')
  , save = require('save')
  , memgo = require('save-memgo')
  , noopLogger = { debug: noop, info: noop, warn: noop, error: noop }
  , async = require('async')

function noop() {}
function randDnName() { return 'db-' + Math.random() }
function createCollection() { return save('jobs', { debug: false, engine: memgo(randDnName()) }) }

describe('scheduler', function () {

  describe('new Scheduler(collection, logger)', function () {

    it('should require a collection', function () {
      assert.throws(function () {
        var s = new Scheduler()
        s.createJob()
      }, /Scheduler requires a `save` collection/)
    })

    it('should use a custom logger if provided')

    it('should use the console for logging by default')

  })

  describe('scheduler.schedule(type, date, data, cb)', function () {

    it('should persist the new job to the collection and return the new job\'s id', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      scheduler.schedule('repair', new Date(), {}, function (err, id) {
        if (err) return done(err)
        assert(id, 'Expected an id to be present')
        collection.read(id, function (err, job) {
          if (err) return done(err)
          assert.equal(typeof job, 'object')
          assert.equal(job.type, 'repair')
          done()
        })
      })

    })

    it('should require a stringy job type', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      scheduler.schedule(null, new Date(), {}, function (err) {
        assert(err)
        assert.equal(err.message, 'Job type must be a string')
        done()
      })

    })

    it('should ensure job date is a date', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      scheduler.schedule('repair', null, {}, function (err) {
        assert(err)
        assert.equal(err.message, 'Job date must be a an instance of Date')
        done()
      })

    })

  })

  describe('scheduler.reschedule(id, date, cb)', function () {

    it('should update the date of the given job', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)
        , updatedDate = new Date(2014, 3, 5)

      scheduler.schedule('repair', new Date(), {}, function (err, id) {
        if (err) return done(err)
        assert(id, 'Expected an id to be present')
        scheduler.reschedule(id, updatedDate, function (err) {
          if (err) return done(err)
          collection.read(id, function (err, job) {
            if (err) return done(err)
            assert.equal(new Date(job.date).toString(), new Date(updatedDate).toString())
            done()
          })
        })
      })

    })

    it('should ensure the reschedule date is a Date object', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      scheduler.schedule('repair', new Date(), {}, function (err, id) {
        if (err) return done(err)
        assert(id, 'Expected an id to be present')
        scheduler.reschedule(id, null, function (err) {
          assert(err)
          assert.equal(err.message, 'Job date must be a an instance of Date')
          done()
        })
      })

    })

    it('should callback with an error if the job does not exist', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      scheduler.reschedule('123', new Date(), function (err) {
        assert(err)
        done()
      })

    })

  })

  describe('scheduler.cancel(id, cb)', function () {

    it('should remove a job from the collection', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      scheduler.schedule('repair', new Date(), {}, function (err, id) {
        if (err) return done(err)
        scheduler.cancel(id, function (err) {
          if (err) return done(err)
          collection.read(id, function (err, obj) {
            assert(!err)
            assert(!obj)
            done()
          })
        })
      })

    })

    it('should callback with an error if the job does not exist', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      scheduler.cancel('abc', function (err) {
        assert(err)
        done()
      })

    })

  })

  describe('scheduler.complete(id, cb)', function () {

    it('should set the complete=true on the job', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      scheduler.schedule('repair', new Date(), {}, function (err, id) {
        if (err) return done(err)
        scheduler.complete(id, function (err) {
          if (err) return done(err)
          collection.read(id, function (err, obj) {
            assert(!err)
            assert.equal(obj.complete, true)
            done()
          })
        })
      })

    })

    it('should callback with an error if the job does not exist', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      scheduler.complete('abc', function (err) {
        assert(err)
        done()
      })

    })

  })

  describe('scheduler.getDue(cb)', function () {

    it('should callback with all of the jobs with a date in the past', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      function createPastJob(n, cb) {
        scheduler.schedule('repair', new Date(2010, 01, 3), {}, cb)
      }

      function createFutureJob(n, cb) {
        scheduler.schedule('repair', new Date((new Date()).getFullYear() + 5, 01, 3), {}, cb)
      }

      async.times(6, createPastJob, function (err, pastIds) {
        if (err) return done(err)
        async.times(4, createFutureJob, function (err) {
          if (err) return done(err)
          scheduler.getDue(function (err, jobs) {
            if (err) return done(err)
            assert.equal(jobs.length, 6)
            assert.deepEqual(jobs.map(function (job) { return job._id }).sort(), pastIds.sort())
            done()
          })
        })
      })

    })

  })

  describe('scheduler.getDue(type, cb)', function () {

    it('should callback with all of the jobs with a date in the past matching the given type', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      function createPastJob(type, n, cb) {
        scheduler.schedule(type, new Date(2010, 01, 3), {}, cb)
      }

      function createFutureJob(n, cb) {
        scheduler.schedule('repair', new Date((new Date()).getFullYear() + 5, 01, 3), {}, cb)
      }

      async.times(6, createPastJob.bind(null, 'repair'), function (err, pastIds) {
        if (err) return done(err)
        async.times(5, createPastJob.bind(null, 'clearCache'), function (err) {
          if (err) return done(err)
          async.times(4, createFutureJob, function (err) {
            if (err) return done(err)
            scheduler.getDue('repair', function (err, jobs) {
              if (err) return done(err)
              assert.equal(jobs.length, 6)
              assert.deepEqual(jobs.map(function (job) { return job._id }).sort(), pastIds.sort())
              done()
            })
          })
        })
      })

    })

    it('should not callback with completed jobs', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      function createPastJob(type, n, cb) {
        scheduler.schedule(type, new Date(2010, 01, 3), {}, function (err, jobId) {
          if (err) return cb(err)
          scheduler.complete(jobId, function (err) {
            if (err) return cb(err)
            cb(null, jobId)
          })
        })
      }

      function createFutureJob(n, cb) {
        scheduler.schedule('repair', new Date((new Date()).getFullYear() + 5, 01, 3), {}, cb)
      }

      async.times(6, createPastJob.bind(null, 'repair'), function (err) {
        if (err) return done(err)
        async.times(5, createPastJob.bind(null, 'clearCache'), function (err) {
          if (err) return done(err)
          async.times(4, createFutureJob, function (err) {
            if (err) return done(err)
            scheduler.getDue('repair', function (err, jobs) {
              if (err) return done(err)
              assert.equal(jobs.length, 0)
              assert.deepEqual([], jobs)
              done()
            })
          })
        })
      })

    })

  })

  describe('scheduler.getCompleted(cb)', function () {

    it('should callback with all of the jobs that are completed', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      function createCompletedJob(n, cb) {
        scheduler.schedule('repair', new Date(), {}, function (err, id) {
          if (err) return cb(err)
          scheduler.complete(id, function (err) {
            if (err) return cb(err)
            cb(null, id)
          })
        })
      }

      function createJob(n, cb) {
        scheduler.schedule('repair', new Date(), {}, cb)
      }

      async.times(6, createJob, function (err) {
        if (err) return done(err)
        async.times(4, createCompletedJob, function (err, ids) {
          if (err) return done(err)
          scheduler.getCompleted(function (err, jobs) {
            if (err) return done(err)
            assert.equal(jobs.length, 4)
            assert.deepEqual(jobs.map(function (job) { return job._id }).sort(), ids.sort())
            done()
          })
        })
      })

    })

  })

  describe('scheduler.getCompleted(type, cb)', function () {

    it('should callback with all of the jobs that are completed matching the given type', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      function createCompletedJob(type, n, cb) {
        scheduler.schedule(type, new Date(), {}, function (err, id) {
          if (err) return cb(err)
          scheduler.complete(id, function (err) {
            if (err) return cb(err)
            cb(null, id)
          })
        })
      }

      function createJob(n, cb) {
        scheduler.schedule('repair', new Date(), {}, cb)
      }

      async.times(6, createJob, function (err) {
        if (err) return done(err)
        async.times(5, createCompletedJob.bind(null, 'repair'), function (err, ids) {
          if (err) return done(err)
          async.times(4, createCompletedJob.bind(null, 'clearCache'), function (err) {
            if (err) return done(err)
            scheduler.getCompleted('repair', function (err, jobs) {
              if (err) return done(err)
              assert.equal(jobs.length, 5)
              assert.deepEqual(jobs.map(function (job) { return job._id }).sort(), ids.sort())
              done()
            })
          })
        })
      })

    })

  })

  describe('scheduler.find(query, cb)', function () {

    // @todo
    // unskip this. sculejs just hangs on queries with the dot notation, but it is needed
    // to do a partial match on the { data: {} } property of the job

    it.skip('should callback with jobs that have data matching the query', function (done) {

      var collection = createCollection()
        , scheduler = new Scheduler(collection, noopLogger)

      function createJob(n, cb) {
        scheduler.schedule('repair', new Date(), { articleId: '' + n }, cb)
      }

      async.times(6, createJob, function (err) {
        if (err) return done(err)
        scheduler.find({ articleId: '2' }, function (err, results) {
          if (err) return done(err)
          assert.equal(results.length, 1)
        })
      })

    })

    it('should create a query in the correct format', function (done) {

      function mockFind(query) {
        assert.deepEqual({ type: 'repair', 'data.a': 10, 'data.b': 'abc' }, query)
        done()
      }

      var scheduler = new Scheduler({ find: mockFind }, noopLogger)
      scheduler.find('repair', { a: 10, b: 'abc' })

    })

  })

})
