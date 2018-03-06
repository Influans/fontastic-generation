let request = require('request');
let fs = require('fs');
let mkdirp = require('mkdirp');
let options = require('minimist')(process.argv.slice(2));
let hostname = 'fontastic.s3.amazonaws.com';

function getBase() {
    return 'https://' + hostname + '/' + options.key + '/';
}

function fetchData(uri, isBinary, callback) {
    let connect = {
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

function processCss(css) {
    let uriRegex = /url\("([a-zA-Z0-9:\/\.?#]*?)"\)/g,
        extRegex = /fonts\/[a-z0-9\.]*?.([a-z]{3,5})/,
        nameRegex = /font-family: "(.*)"/,
        remoteNameRegex = /fonts\/([a-z0-9]*)/,
        result, fontUri, fontName, remoteFontName, localCss;

    fontName = nameRegex.exec(css)[1];
    remoteFontName = remoteNameRegex.exec(css)[1];

    let dirFont = 'fonts/';

    if (options.dirFont) {
        dirFont = options.dirFont + '/' + dirFont;
    }

    localCss = css.replace(new RegExp('url\\("https:\/\/file.myfontastic.com\/' + options.key + '\/fonts\/', 'g'), 'url("' + dirFont);
    localCss = localCss.replace(new RegExp(remoteFontName, 'g'), fontName);

    fs.writeFileSync(options.dest + '/' + 'fontastic.css', localCss);

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
    let dest = options.dest + '/fonts';
    console.log(dest + '/' + fontName + '.' + extension);

    mkdirp(dest, () => {
        fs.writeFileSync(dest + '/' + fontName + '.' + extension, new Buffer(font, 'binary'), { encoding: null });
    });
}

fetchData(getBase() + 'icons.css', false, processCss);