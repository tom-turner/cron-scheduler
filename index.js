require('dotenv').config()
const http = require('http')
const fs = require('fs')
const CronJob = require('cron').CronJob;
const jobsFile = './schedules.json'
const PORT = process.env.PORT || 5000
const getJobs = () => {
    return JSON.parse(fs.readFileSync(jobsFile, 'utf8'))
}

const updateJobStatus = (job, status) => {
    const jobs = getJobs()
    const newJobs = jobs.map(j => {
        if (j.id === job.id) {
            return {
                ...j,
                status
            }
        }
        return j
    })
    fs.writeFileSync(jobsFile, JSON.stringify(newJobs))
}

const runNow = (job) => {
    console.log('fetching ' + job.url)
    try {
        fetch(job.url, {
            headers: {
                "Authorization": job.secret || '',
            },
        }).then(res => {
            console.log('status ' + res.status)
            updateJobStatus(job, res.status.toString())
        }).catch(err => {
            console.log(err)
            updateJobStatus(job, 'error')
        })
    } catch (err) {
        console.log(err)
        updateJobStatus(job, 'error')
    }
}

const runJob = (job) => {
    return new CronJob(job.cron, () => {
        runNow(job)
    }, null, true, 'GMT')
}
    

const addJob = (job) => {
    const jobs = getJobs()

    jobs.push({
        id: jobs.length + 1,
        ...job
    })

    fs.writeFileSync(jobsFile, JSON.stringify(jobs))
    process.exit(0) // just exit and let pm2 restart
}

const deleteJob = (job) => {
    const jobs = getJobs()
    const newJobs = jobs.filter(j => j.id !== parseInt(job.id))
    fs.writeFileSync(jobsFile, JSON.stringify(newJobs))
    // end process to let pm2 restart
    process.exit(0) // just exit and let pm2 restart
}

const checkFileStatus = () => {
    if (!fs.existsSync(jobsFile)) {
        fs.writeFileSync(jobsFile, JSON.stringify([]))
    } else {
        // check if file is valid json
        try {
            const content = fs.readFileSync(jobsFile, 'utf8')
            //if content is not a valid json array throw error
            if (!Array.isArray(JSON.parse(content))) {
                throw new Error('invalid json')
            }
        }
        catch (err) {
            fs.writeFileSync(jobsFile, JSON.stringify([]))
        }
    }
}

const setup = async () => {
    await checkFileStatus()
    const jobs = getJobs()
    const runningJobs = []

    const statusJob = {
        cron: '* * * * * *',
        url: 'http://localhost:' + PORT + '/api/status'
    }

    if (!jobs.find(j => j.url === statusJob.url)) {
        runningJobs.push({
            ...statusJob,
            id: runningJobs.length + 1
        })
        runJob(statusJob)
    } 

    for (const job of jobs) {
        runningJobs.push({
            ...job,
            id: runningJobs.length + 1
        })
        runJob(job)
    }

    fs.writeFileSync(jobsFile, JSON.stringify(runningJobs))
}

const checkAPISecret = (req) => {
    const secret = req.headers.authorization
    if (secret !== process.env.PASSWORD) {
        return false
    }
    return true
}

setup().then(() => {
    const server = http.createServer((req, res) => {
        const session = req.headers.authorization === process.env.PASSWORD

        if (req.url === '/api/status') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json'); // Updated header method
            return res.end(JSON.stringify({ status: 'ok' })); // Stringify the JSON object
        }

        if (session && req.url === '/api/get-jobs') {   
            res.setHeader('Content-Type', 'application/json'); // Updated header method
            return res.end(JSON.stringify(getJobs())); // Stringify the JSON object
        }

        if (session && req.url === '/api/add-job') {
            res.setHeader('Content-Type', 'application/json'); // Updated header method
            const body = [];
            req.on('data', (chunk) => {
                body.push(chunk);
            }).on('end', () => {
                const data = JSON.parse(Buffer.concat(body).toString());
                addJob(data)
                return res.end(JSON.stringify({ status: 'ok' })); // Stringify the JSON object
            });
        }

        if(session && req.url === '/api/run-now') {
            res.setHeader('Content-Type', 'application/json'); // Updated header method
            const body = [];
            req.on('data', (chunk) => {
                body.push(chunk);
            }).on('end', () => {
                const data = JSON.parse(Buffer.concat(body).toString());
                const id = data.id
                const jobs = getJobs()
                const job = jobs.find(j => j.id === parseInt(id))
                runNow(job)
                return res.end(JSON.stringify({ status: 'ok' })); // Stringify the JSON object
            });
        }

        if (session && req.url === '/api/delete-job') {
            res.setHeader('Content-Type', 'application/json'); // Updated header method
            const body = [];
            req.on('data', (chunk) => {
                body.push(chunk);
            }).on('end', () => {
                const data = JSON.parse(Buffer.concat(body).toString());
                deleteJob(data)
                return res.end(JSON.stringify({ status: 'ok' })); // Stringify the JSON object
            });
        }

        if (req.url === '/') {
            res.setHeader('Content-Type', 'text/html'); // Updated header method
            return fs.createReadStream('index.html').pipe(res);
        }

        res.writeHead(404, { 'Content-Type': 'text/html' }); // Updated header method
        return res.end('404');
    });

    server.listen(PORT, () => {
        console.log('Server is running on port ' + PORT);
    });
})
