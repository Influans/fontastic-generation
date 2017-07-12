#!/usr/bin/env node

'use strict';

let request = require('request');
let fs = require('fs-extra');
let argv = require('yargs').argv;
let options = {
    hostname: 'fontastic.s3.amazonaws.com',
    base64: argv.base64,
    dest: argv.dest || '',
    key: argv.key,
};

startProcess();

function getBase() {
    return 'https://' + options.hostname + '/' + options.key + '/';
}

function fetchData(uri, isBinary, callback) {
    var connect = {
        gzip: true,
        uri: uri,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'
        }
    };

    if (isBinary) {
        connect.encoding = 'binary';
    }

    request(connect, function(err, res, content) {
        if (err) {
            console.log(['Error on fetch', uri, isBinary, err].join(' ;; '));
        }

        if (res && res.statusCode === 200) {
            return callback(content);
        }

    });
}

function fetchCss(callback) {
    return fetchData(getBase() + 'icons.css', false, callback);
}

function fetchFont(path, callback) {
    return fetchData(path, true, callback);
}

function startProcess() {
    fetchCss(processCss);
}

function processCss(css) {
    var uriRegex = /url\("([a-zA-Z0-9:\/\.?#]*?)"\)/g,
        extRegex = /fonts\/[a-z0-9\.]*?.([a-z]{3,5})/,
        nameRegex = /font-family: "(.*)"/,
        remoteNameRegex = /fonts\/([a-z0-9]*)/,
        result, fontUri, fontName, remoteFontName, localCss;

    fontName = nameRegex.exec(css)[1];
    remoteFontName = remoteNameRegex.exec(css)[1];

    localCss = css.replace(new RegExp('url\\("https:\/\/file.myfontastic.com\/' + options.key + '\/fonts\/', 'g'), 'url("fonts/');
    localCss = localCss.replace(new RegExp(remoteFontName, 'g'), fontName);

    let src = options.dest + '/' + 'fontastic.css';
    fs.writeFile(src, localCss, (err) => {
        if (err) {
            console.error('Something went wrong while writing file ' + src + ' : ', err);
        }
    });

    while ((result = uriRegex.exec(css)) !== null) {
        fontUri = result[1];

        (function(uri) {
            fetchData(result[1], true, function(font) {
                processFont(fontName, extRegex.exec(uri)[1], font);
            });
        })(fontUri);
    }
}

function processFont(fontName, extension, font) {
    console.log(options.dest + '/fonts/' + fontName + '.' + extension);
    let src = options.dest + '/fonts/' + fontName + '.' + extension;
    //grunt.file.write(options.dest + '/fonts/' + fontName + '.' + extension, new Buffer(font, 'binary'), { encoding: null });
    fs.writeFile(src, font, 'binary', (err) => {
        if (err) {
            console.error('Something went wrong while writing file ' + src + ' : ', err);
        }
    });
}
