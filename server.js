/*
    This file is part of REDUS Framework from IMR Norway.

    Copyright (C) 2019 Ibrahim Umar and the REDUS IMR Norway team.

    REDUS Framework is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    REDUS Framework is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with REDUS Framework.  If not, see <https://www.gnu.org/licenses/>.
*/

const serverPort = 3000;
const serverIp = 'localhost';

const Koa = require('koa');

const compress = require('koa-compress');
const compose = require('koa-compose');
const koaBody = require('koa-body');
const send = require('koa-send')
const httpProxy = require('http-proxy');

// Docker machine CLI
const DockerMachineCLI = require('dockermachine-cli-js');
/*
const DMkeyValueObject = {
    'driver': 'scaleway',
    'scaleway-token': process.env.SCTOKEN,
    'scaleway-organization': process.env.SCORG,
    'scaleway-commercial-type': 'START1-S',
    'scaleway-image': 'ubuntu-xenial',
};


const DMkeyValueObject = {
    'driver': 'virtualbox',
    'virtualbox-cpu-count': '2',
    'virtualbox-memory' : '2048'
}
*/

const DMkeyValueObject = {
    'driver': 'kvm',
    'kvm-memory' : '2048'
}


// Docker CLI
var dockerCLI = require('docker-cli-js');

var DockerOptions = dockerCLI.Options;
var Docker = dockerCLI.Docker;

// Other packages
const fs = require('fs');
const os = require('os');
const util = require('util');

// Proxy
const proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    ws: true
})

proxy.on('error', function (err, req, res) {
    if (typeof res.writeHead === 'function')
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });

    res.end('Something went wrong. And we are reporting a custom error message.');
});

// Global variable for id to IP mapping
var idToip = []

// PrepareFile function

async function prepareFile(id, path, config) {
    const http = require('http');
    const targz = require('targz');

    
    // Stats
    let filePrepared = false

    console.log("Preparing file -- Start")

    // Redus pipeline
    const remote = 'https://github.com/REDUS-IMR/docker-redus-pipeline.git';

    let gitresult
    try {
        gitresult = await require('simple-git')(path).silent(true).clone(remote)
    } catch(err) {
        console.error('Getting redus-pipeline from github failed: ', err)
        fs.writeFileSync(path + "/" + "prepareFile.status", "2");
        return ([filePrepared])
    }

    // Assessment file
    const src = 'http://' + serverIp + ':' + serverPort + '/v1/getAssFiles';
    const dst = path + "/src.tgz";

    // TODO: Better downloader and extractor
    // (https://stackoverflow.com/questions/11944932/how-to-download-a-file-with-node-js-without-using-third-party-libraries)

    var download = util.promisify(function(url, dest , cb) {
        var file = fs.createWriteStream(dest);
        var request = http.get(url, function(response) {
          response.pipe(file);
          file.on('finish', function() {
            file.close(cb);  // close() is async, call cb after close completes.
          });
        }).on('error', function(err) { // Handle errors
          fs.unlink(dest); // Delete the file async. (But we don't check the result)
          if (cb) cb(err.message);
        });
      });



    // Download file
    let result = await download(src, dst);

    //Decompress
    const decompressP = util.promisify(targz.decompress)
    let decompress
    try {
        decompress = await decompressP({
            src: dst,
            dest: path + "/docker-redus-pipeline/projects"
        })
    } catch (err) {
        if(err) {
            console.log(err);
            fs.writeFileSync(path + "/" + "prepareFile.status", "2");
            return ([filePrepared])
        }
    };

    // Put UUID in id.conf (for proxy purposes later)
    fs.writeFileSync(path + "/docker-redus-pipeline/projects/id.conf", id);


    // Configuration
    console.log(config)

    if(config != null) {
        // Prepare conf directory 
        // TODO: use conf
        confPath = path + "/docker-redus-pipeline/projects/neacod-2018/redus"

        // Read template
        confTemplate = fs.readFileSync("extra/redus.yaml", "utf8")
        const YAML = require('yaml')
        txtTemplate = YAML.parse(confTemplate)

        console.log(txtTemplate)
        
        // Get survey entries
        const sEntries = config.survey.entries

        let iter = 0

        sEntries.forEach(function(element){
            console.log(element);
            if(element.process!='asis' && element.process!="manual") {

                iter++
                fl = element.fleetName.split(" ")
                fleet = fl[fl.length-1]
                if(element.process == 'remote') {
                    sourceAge = true
                    sourceYear = true
                    buildConf = ''
                }else if(element.process == 'build') {
                    sourceAge = true
                    sourceYear = false
                    // Process xml here
                    console.log(element.buildParameters)

                    if (!fs.existsSync(confPath)){
                        fs.mkdirSync(confPath);
                    }

                    // Write config
                    fs.writeFileSync(confPath + "/" + fleet + ".xml" , element.buildParameters.trim())

                    // Write config
                    buildConf = "redus/" + fleet + ".xml"

                    element.remoteSource = ''
                }
                prefix = 'survey.update.'
                txtTemplate.default[prefix + iter + '.mode'] = element.process
                txtTemplate.default[prefix + iter + '.surveyBuildConf'] = buildConf
                txtTemplate.default[prefix + iter + '.header'] = fleet
                txtTemplate.default[prefix + iter + '.stssource'] = element.remoteSource
                txtTemplate.default[prefix + iter + '.stsdate'] = ''
                txtTemplate.default[prefix + iter + '.useSourceAge'] = sourceAge
                txtTemplate.default[prefix + iter + '.useSourceYear'] = sourceYear

                // Write conf
                if (!fs.existsSync(confPath)){
                    fs.mkdirSync(confPath);
                }

                fs.writeFileSync(confPath + "/redus.yaml" , YAML.stringify(txtTemplate))
            
            }
        });
        console.log(txtTemplate)
    }

    filePrepared = true

    fs.writeFileSync(path + "/" + "prepareFile.status", "1");
    console.log("Preparing file -- Finish")

    return ([filePrepared])

}

async function createMachine(id, path) {

    // Stats
    let vmCreateFail = false;
    //let vmStartFail = false;
    let vmGotIPFail = false;
    let vmIP = "";

    console.log("Creating machine -- Start")

    const options = new DockerMachineCLI.Options(
     /* keyValueObject */ DMkeyValueObject,
     /* currentWorkingDirectory */ path);

    const dockerMachine = new DockerMachineCLI.DockerMachine(options);
    const dockerMachine2 = new DockerMachineCLI.DockerMachine();

    // Try to create the machine
    let DMcreate
    try {
        DMcreate = await dockerMachine.command('create '+ id)
    } catch (err) {
        console.log("Create fail!")
        fs.writeFileSync(path + "/" + "prepareVM.status", "2");
        vmCreateFail = vmGotIPFail = true
        console.log(err)
    }

    console.log(DMcreate)

    // Try to get the ip of the machine
    let DMenv
    if (!vmCreateFail) {
        try {
            DMenv = await dockerMachine2.command('ip '+ id)
        } catch (err) {
            fs.writeFileSync(path + "/" + "prepareVM.status", "2");
            vmGotIPFail = true
            console.log(err)
        }
    }

    console.log(DMenv)

    if (!vmGotIPFail) {
        //vmIP = new URL(DMenv.DOCKER_HOST).hostname
        vmIP = DMenv.raw.replace(/\\n|\"/g, "");

        console.log("Got IP: " + vmIP)

        fs.writeFileSync(path + "/" + "prepareVM.status", "1");
        fs.writeFileSync(path + "/" + "VM.IP", vmIP);
    }

    // Map the ID to IP
    idToip[id] = vmIP

    console.log("Creating machine -- Finish")

    return([vmIP])
}

async function runVM(id, path) {

    let vmStarted = false

    console.log("Starting VM -- start")

    let dockerfilePath = path + "/docker-redus-pipeline"

    var options = new DockerOptions(
        id,
        dockerfilePath
    );

    var docker = new Docker(options);

    let data

    // Build image
    try {
        data = await docker.command('build --pull --rm -t ' + id + ' .')
    } catch (err) {
        if(err) {
            console.log(err);
            fs.writeFileSync(path + "/" + "startVM.status", "2");
            return ([vmStarted])
        }
    }

    console.log('data = ', data);

    // Start VM
    try {
        data = await docker.command('run --name ' + id + '-run -p 8888:8888 -dit ' + id)
    } catch (err) {
        if(err) {
            console.log(err);
            fs.writeFileSync(path + "/" + "startVM.status", "2");
            return ([vmStarted])
        }
    }

    console.log('data = ', data);

    vmStarted = true

    fs.writeFileSync(path + "/" + "startVM.status", "1");

    console.log("Starting VM -- finish")


    return ([vmStarted])
}


async function initGlobal(id, path, config) {
        // Do machine creation and preparing file in parallel
        const [result1, result2] = await Promise.all([createMachine(id, path), prepareFile(id, path, config)]);

        // Run machine (do it async)
        const result3 = runVM(id, path)
}

// x-response-time

async function responseTime(ctx, next) {
    const start = new Date();
    await next();
    const ms = new Date() - start;
    ctx.set('X-Response-Time', ms + 'ms');
}

// logger

async function logger(ctx, next) {
    const start = new Date();
    await next();
    const ms = new Date() - start;
    if ('test' != process.env.NODE_ENV) {
        console.log('%s %s - %s', ctx.method, ctx.url, ms);
    }
}

// JSON escape
function jsonEscape(str)  {
    return str.replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "    ");
}


// response
async function respond(ctx, next) {

    const body = ctx.request.body;

    // Allow any requests origin for now
    ctx.set('Access-Control-Allow-Origin', '*');

    if('/v1/getConfig' == ctx.url) {
        // Get all posted variable
        let assID = body.assID
        let yrID = body.assYR
        //TODO: Get conf on the fly:

        let rawdata = fs.readFileSync('extra/'+assID+'-'+yrID+'.json', 'utf8');
        let config = JSON.parse(jsonEscape(rawdata));
        ctx.body = config
        return;
    }

    if ('/v1/getAssFiles' == ctx.url) {
        await send(ctx, "extra/neacod-2018.tgz")
        return;
    }

    if ('/v1/checkInit' == ctx.url) {
        let newid = body.id
        let status = [-1, -1, -1];
        let ipAddr = null

        if(newid != "") {
            console.log("ID request: " + newid)

            let path = os.tmpdir() + "/" + newid + "/" + "prepareVM.status";
            if(fs.existsSync(path))
                status[0] = parseInt(fs.readFileSync(path, "utf8"))

            path = os.tmpdir() + "/" + newid + "/" + "prepareFile.status";
            if(fs.existsSync(path))
                status[1] = parseInt(fs.readFileSync(path, "utf8"))

            path = os.tmpdir() + "/" + newid + "/" + "startVM.status";
            if(fs.existsSync(path))
                status[2] = parseInt(fs.readFileSync(path, "utf8"))

            path = os.tmpdir() + "/" + newid + "/" + "VM.IP";
            if(fs.existsSync(path))
                ipAddr = fs.readFileSync(path, "utf8")
        }

        ctx.body = { status: status, ipAddr: ipAddr}

        return;
    }

    let env
    // Make new docker node
    if ('/v1/createNew' == ctx.url) {
        // Process config!
        const reqconfig = body.config

        // Getting ID
        const uuidv4 = require('uuid/v4');
        const newid = await uuidv4().split("-").join(".");
        let path = os.tmpdir() + "/" + newid;

        // Make Directory
        fs.mkdirSync(path);

        console.log("Directory created: " + path)

        // Go INIT!
        initGlobal(newid, path, reqconfig)

        ctx.body = { id: newid };
        return;
    }

    if (ctx.path === '/') {
        await send(ctx, "static/index.html")
        return;
    }
    await send(ctx, ctx.path, { root: __dirname + "/static" })
}

// Proxy for redirecting user panels
async function userProxy(ctx, next) {
    if (ctx.path.indexOf('\/id\/') > -1) {
        console.log('Earlier' + ctx.path)
        ctx.respond = false
        var reqid = ctx.path.split('/')
        var ip = idToip[reqid[2]]
        var targetUrl = "http://"+ ip + ":8888"
        console.log('Later: ' + targetUrl)
        
        // Forward body request
        ctx.req.body = ctx.request.body

        await proxy.web(ctx.req, ctx.res, { target: targetUrl })
    } else {
        await next()
    }
}

// Start koa server here
const app = module.exports = new Koa();

// Parse request body properly
app.use(koaBody({
    jsonLimit: '1mb'
}));

// Use compression for appropriate types
app.use(compress({
    filter: function (content_type) {
        return /text/i.test(content_type)
    },
    threshold: 2048,
    flush: require('zlib').Z_SYNC_FLUSH
}))

// composed middleware
const all = compose([
    responseTime,
    logger,
    userProxy,
    respond
]);

app.use(all);


// Listen server
var server
if (!module.parent)
    server = app.listen(serverPort, "0.0.0.0");

// For websockets
server.on('upgrade', (req, socket, head) => {
    console.log('origin ws: ' + req.url)
    if (req.url.indexOf('\/id\/') > -1) {
        var reqid = req.url.split('/')
        var ip = idToip[reqid[2]]
        var targetUrl = "http://" + ip + ":8888"

        console.log('req ws: ' + JSON.stringify(req.body))

        console.log('Dest ws: ' + targetUrl)
        proxy.ws(req, socket, head, { target: targetUrl })
    }
})

// For properly forwarding POST request
// socket.io will have trouble with header set,
// so leave it as it is in the last else
proxy.on('proxyReq', (proxyReq, req) => {

    if ( !req.body || !Object.keys( req.body ).length ) {
        return;
    }

    let contentType = proxyReq.getHeader( 'Content-Type' );
    let bodyData;

    if ( contentType.includes( 'application/json' ) ) {
        bodyData = JSON.stringify( req.body );
    } else if ( contentType.includes( 'application/x-www-form-urlencoded' ) ) {
        bodyData = queryString.stringify( req.body );
    } else {
        bodyData = req.body;
    }

    if ( bodyData ) {
        proxyReq.setHeader( 'Content-Length', Buffer.byteLength( bodyData ) );
        proxyReq.write( bodyData );
    }
});
