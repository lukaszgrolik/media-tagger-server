
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';
// import * as yargs from 'yargs';
import * as cors from 'cors';
// import * as bodyParser from 'body-parser';
import * as yaml from 'yaml';

import { validateConfig } from './config-validation';
import { projectFiles } from './api/project-files';
import { Adapters, JsonDB } from './json-db/json-db';
import { projectTags } from './api/project-tags';
import { JsonDbData, JsonDbInstance } from './types';
import { JobService } from './lib/job-service';
import { projectJobs } from './api/project-jobs';

const configStr = fs.readFileSync('./config.yaml', 'utf8')
const configVal = yaml.parse(configStr);
const config = validateConfig(configVal);

const dbs = Object.keys(config.projects).reduce((prev: {[projectName: string]: JsonDB<JsonDbData>}, p) => {
    const db = new JsonDB<JsonDbData>({
        adapter: new Adapters.File({
            filePath: config.getDbPath(p),
        }),
        hooks: {

        }
    });

    prev[p] = db;

    return prev;
}, {});

const app = express();

app.use(cors());
app.use(express.json());

Object.keys(config.projects).forEach(projectName => {
    app.use(`/${projectName}/assets`, express.static(config.getMediaFolderPath(projectName)));
    app.use(`/${projectName}/posters`, express.static(config.getPostersFolderPath(projectName)));
    app.use(`/${projectName}/thumbnails`, express.static(config.getThumbnailsFolderPath(projectName)));
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/projects', (req, res) => {
    res.json(Object.keys(config.projects));
});

const projectRouter = express.Router()

// projectRouter.use<{projectName: string}>('/', async (req, res, next) => {
//     // const dbPath = config.getDbPath(req.params.projectName)
//     console.log('use req.params', req.params)
//     console.log('use req.params.projectName', req.params.projectName)
//     const db = dbs[req.params.projectName];

//     // @todo throw if db does not found (invalid projectName)

//     res.locals.projectName = req.params.projectName;
//     console.log('use res.locals.projectName', res.locals.projectName)

//     res.locals.db = db;

//     next();
// });

projectJobs(projectRouter, config);
projectFiles(projectRouter, config);
projectTags(projectRouter);

projectRouter.get('/db', async (req, res) => {
    // const dbPath = path.resolve(__dirname, config.projects[req.params.projectName].db);

    // const dbStr = await fs.promises.readFile(dbPath, {encoding: 'utf-8'});

    const db = res.locals.db as JsonDbInstance;
    const data = await db.read();

    res.json(data);
});

app.use('/:projectName', async (req, res, next) => {
    // const dbPath = config.getDbPath(req.params.projectName)
    const db = dbs[req.params.projectName];

    if (!db) {
        res.json({
            error: `Database not found for project "${req.params.projectName}"`,
        });

        return;
    }

    // @todo throw if db does not found (invalid projectName)

    res.locals.projectName = req.params.projectName;

    const jobService = new JobService();

    res.locals.jobService = jobService;
    res.locals.db = db;

    next();
}, projectRouter);

const errorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
    if (err) {
        console.error(err);

        res.status(500);
        res.json({
            error: err.message,
            message: err.stack,
        });
    }
    else {
        next();
    }
}
app.use(errorHandler);

app.listen(config.port, () => {
    console.log(`Example app listening at http://localhost:${config.port}`);
    console.log(`Projects: ${Object.keys(config.projects).join(', ')}`);
});