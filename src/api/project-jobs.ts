import * as express from 'express';

import { Config } from '../config-validation';

export const projectJobs = (app: express.Router, config: Config) => {

    type ProjectJobsResBody = {
        jobs: {
            id: number;
            name: string;
            // input:
            progress: { count: number; progress: number };
            failed: {
                path: string;
                error: Error;
            }[];
            succeeded: {
                src: string;
                dest: string;
            }[];
        }[];
    };

    app.get<{}, ProjectJobsResBody>('/jobs', (req, res) => {
        const jobService = res.locals.jobService;

        res.json({
            jobs: jobService.jobs
        });

        // posterJobsStore.removeFinishedJobs();
    });

};