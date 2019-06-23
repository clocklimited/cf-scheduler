# cf-scheduler

[![Greenkeeper badge](https://badges.greenkeeper.io/clocklimited/cf-scheduler.svg)](https://greenkeeper.io/)

Schedule arbitrary jobs to be run in the future

## Installation

    npm install --save cf-scheduler

## Usage

### var Scheduler = require('cf-scheduler')

### var scheduler = new Scheduler(collection, logger)

Pass in a [save](https://github.com/serby/save) collection to persist jobs, and optionally
a logger (console will be used by default).

### scheduler.schedule(type, date, data, cb)

Create a job.

- `type` must be a string indicating the job type
- `date` must be a date indicating when the job should run
- `data` is a place for job meta data, or data that the job runner will require to complete the job
- `cb` is a callback with signature `function (err, jobId) {}`

### scheduler.reschedule(id, date, cb)

Update the date for a job.

- `id` is the job ID received in the `schedule()` callback
- `date` is the new date
- `cb` is a callback with signature `function (err) {}`

### scheduler.cancel(id, cb)

Cancels a job.

- `id` is the job ID received in the `schedule()` callback
- `cb` is a callback with signature `function (err) {}`

### scheduler.getDue(type, cb)

Gets a list of jobs that are due – i.e. their date is in the past.

- `type` if specified, will only get due jobs of this type
- `cb` is a callback with signature `function (err, jobs) {}`

### scheduler.getCompleted(type, cb)

Gets a list of jobs that have been marked as complete.

- `type` if specified, will only get complete jobs of this type
- `cb` is a callback with signature `function (err, jobs) {}`

### scheduler.complete(id, cb)

Mark a job as complete.

- `id` is the job ID received in the `schedule()` callback
- `cb` is a callback with signature `function (err) {}`

### scheduler.find(type, query, cb)

Find a job based on its attached `data`. For example, if you created a job with:

```js
scheduler.schedule('publish', new Date(), { articleId: '123' }, function () {})
```

You can retrieve it with:

```js
scheduler.find({ articleId: '123'}, function () {})
```

- `type` is optional
- `query` is an object of properties to match against the `data` attachment of the job
- `cb` is a callback with signature `function (err, jobs) {}`

## Credits
Built by developers at [Clock](http://clock.co.uk).

## Licence
Licensed under the [New BSD License](http://opensource.org/licenses/bsd-license.php)
