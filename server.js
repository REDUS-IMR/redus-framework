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


const http = require('follow-redirects').http
const Koa = require('koa');

const compress = require('koa-compress');
const compose = require('koa-compose');
const koaBody = require('koa-body');

// User modules
const machinepool = require("./data.js")

const proxyObj = require("./proxy.js")
const proxy = proxyObj.globalProxy
const userProxy = proxyObj.userProxy

const respond = require("./response.js")

const globalConfig = require("./config.js")

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

console.log(globalConfig.serverPort)
console.log(globalConfig.serverIp)

app.use(all);

// Listen server
var server
if (!module.parent)
    server = http.createServer(app.callback()).listen(globalConfig.serverPort);

// For websockets
server.on('upgrade', (req, socket, head) => {
    console.log('origin ws: ' + req.url)
    if (req.url.indexOf('\/id\/') > -1) {
        var reqid = req.url.split('/')

        var [ip, port] = machinepool.getipport(reqid[2])

        var targetUrl = "http://"+ ip + ":" + port

        console.log('req ws: ' + JSON.stringify(req.body))

        console.log('Dest ws: ' + targetUrl)
        proxy.ws(req, socket, head, { target: targetUrl }, function(e){
            if(e){
                console.error(e.message);
                console.log(req.headers.host,'-->',targetUrl);
                console.log('-----');
            }
        });
    } else if (req.url.indexOf('\/notebook') > -1) {
        var targetUrl = "http://127.0.0.1:3001"
	console.log(req)
        proxy.ws(req, socket, head, { target: targetUrl }, function(e){
            if(e){
                console.error(e.message);
                console.log(req.headers.host,'-->',targetUrl);
                console.log('-----');
            }
        });
    }

})

