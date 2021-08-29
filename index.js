
const path = require('path')
const fs = require('fs')
const express = require('express')
// const yargs = require('yargs');
const glob = require("glob")
const cors = require("cors");
const yaml = require("yaml");

const configStr = fs.readFileSync('./config.yaml', 'utf8')
const config = yaml.parse(configStr);

const app = express();

const getDirectories = async source => {
    const results = await fs.promises.readdir(source, { withFileTypes: true });

    return results.filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort((a, b) => a.localeCompare(b))
};

const convertPath = str => str.replace(/\\/g, '/');

const searchGlob = globPath => {
    return new Promise((res, rej) => {

        glob(globPath, {strict: true}, (err, files) => {
            // files is an array of filenames.
            // If the `nonull` option is set, and nothing
            // was found, then files is ["**/*.js"]
            // err is an error object or null.

            if (err) {
                rej(err);
            }

            res(files);
        });
    });
};
// fixes issue when no files found on "Z:/"
const searchGlobDisk = async (rootPath, fileGlob) => {
    const dirs = await getDirectories(rootPath);

    const promises = dirs.map(dir => {
        const subDirPath = convertPath(path.resolve(rootPath, dir, fileGlob));
        // console.log('subDirPath', subDirPath)
        return searchGlob(subDirPath);
    });
    const filesResults = await Promise.all(promises);
    return filesResults.flat();
};

const getMediaFolderPath = (projectName) => {
    return path.resolve(__dirname, config.projects[projectName].path);
};

app.use(cors());

Object.keys(config.projects).forEach(projectName => {
    app.use(`/${projectName}/assets`, express.static(getMediaFolderPath(projectName)));
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/projects', (req, res) => {
    res.json(Object.keys(config.projects));
});

app.get('/:projectName/files', async (req, res) => {
    const mediaFolderPath = getMediaFolderPath(req.params.projectName);

    // console.log('mediaFolderPath', convertPath(mediaFolderPath))

    // res.send('Hello World!');
    const ext = ['mp4', 'webm', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
    const extStr = ext.map(e => [e, e.toUpperCase()]).flat().join(',');
    const fileGlob = `**/*.{${extStr}}`;

    const files = await (() => {
        if (config.projects[req.params.projectName].disk) {
            return searchGlobDisk(mediaFolderPath, fileGlob);
        }
        else {
            const globPath = convertPath(path.resolve(mediaFolderPath, fileGlob));
            // const globPath = convertPath(path.resolve(mediaFolderPath, '*'));
            // console.log('globPath', globPath)

            return searchGlob(globPath);
        }
    })();
    // console.log(files.slice(0, 10))

    const paths = files.map(f => {
        let root = convertPath(mediaFolderPath);
        if (root[root.length - 1] === '/') root = root.slice(0, -1);

        return f.replace(root, '');
    });

    res.json(paths);
});

app.get('/:projectName/db', async (req, res) => {
    const dbPath = path.resolve(__dirname, config.projects[req.params.projectName].db);

    const dbStr = await fs.promises.readFile(dbPath, {encoding: 'utf-8'});

    res.json(JSON.parse(dbStr).collections);
});

app.listen(config.port, () => {
    console.log(`Example app listening at http://localhost:${config.port}`);
    console.log(`Projects: ${Object.keys(config.projects).join(', ')}`);
});