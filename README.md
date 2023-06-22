# Cron Scheduler

Cron Scheduler is a simple cron scheduling app that allows you to schedule and automate fetching URL endpoints using cron expressions. This can be useful for triggering scheduled jobs on serverless apps. This README.md file provides the steps to get up and running with Cron Scheduler.

## Getting Started

To get started with Cron Scheduler, follow the steps below:

1. Install PM2 globally by running the following command:
`npm install -g pm2`


2. Install the dependencies by navigating to the root directory of the Cron Scheduler app and running the command:
npm ci

3. Start Cron Scheduler with PM2 and save it to boot using the following commands in the root directory of the app:
`pm2 start index.js --name cron-scheduler`
`pm2 startup`
`pm2 save`


After executing the above steps, Cron Scheduler will be up and running, and PM2 will save the configuration to ensure the app starts automatically on system boot.

## Usage

Once Cron Scheduler is running, you can access it at localhost:3000

## Troubleshooting

If you encounter any issues during the installation or execution of Cron Scheduler, please seek help from the development team.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.