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

const runJob = (job) => {
    return new CronJob(job.cron, () => {
        console.log('fetching ' + job.url)
        try {
            fetch(job.url).then(res => {
                console.log('status ' + res.status)
                updateJobStatus(job, res.status.toString())
            })
        } catch (err) {
            console.log(err)
            updateJobStatus(job, 'error')
        }
    }, null, true, 'GMT')
}

const addJob = (job) => {
    const jobs = getJobs()

    const id = jobs.length + 1
    jobs.push({
        id,
        ...job
    })

    fs.writeFileSync(jobsFile, JSON.stringify(jobs))
    process.exit(0) // just exit and let pm2 restart
}

const deleteJob = (job) => {
    const jobs = getJobs()
    const newJobs = jobs.filter(j => j.id !== parseInt(job.id))
    console.log(newJobs)
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

    const statusJob = {
        cron: '* * * * * *',
        url: 'http://localhost:' + PORT + '/api/status'
    }

    if (!jobs.find(j => j.url === statusJob.url)) {
        addJob(statusJob)
    }

    for (const job of jobs) {
        runJob(job)
    }
}

setup().then(() => {
    const server = http.createServer((req, res) => {
        if (req.url === '/api/status') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json'); // Updated header method
            return res.end(JSON.stringify({ status: 'ok' })); // Stringify the JSON object
        }

        if (req.url === '/api/get-jobs') {
            res.setHeader('Content-Type', 'application/json'); // Updated header method
            return res.end(JSON.stringify(getJobs())); // Stringify the JSON object
        }

        if (req.url === '/api/add-job') {
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

        if (req.url === '/api/delete-job') {
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
