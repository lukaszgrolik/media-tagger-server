
const path = require('path')
const express = require('express')
const yargs = require('yargs');
const glob = require("glob")
const cors = require("cors")

const app = express();
const port = 3060;

const mediaFolderPath = path.resolve(__dirname, yargs.argv.f);

app.use(cors());
app.use('/public', express.static(mediaFolderPath));

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/files', (req, res) => {

    const convertPath = str => str.replace(/\\/g, '/');

    // res.send('Hello World!');
    glob(path.resolve(mediaFolderPath, '**/*.{mp4, jpg, jpeg}'), {}, (err, files) => {
        // files is an array of filenames.
        // If the `nonull` option is set, and nothing
        // was found, then files is ["**/*.js"]
        // err is an error object or null.

        const paths = files.map(f => {
            return f.replace(convertPath(mediaFolderPath), '');
        });

        res.json(paths);
    });
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});