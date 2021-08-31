/*
    This file is part of REDUS Framework from IMR Norway.

    Copyright (C) 2020 Ibrahim Umar and the REDUS IMR Norway team.

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

const httpProxy = require('http-proxy');

var machinepool = require("./data.js")


// Proxy init
const proxy = httpProxy.createProxyServer({
    toProxy: true,
    changeOrigin: true,
    ws: true
})

proxy.on('error', function (err, req, res) {
    if (typeof res.writeHead === 'function')
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });

    res.end('Something went wrong. And we are reporting a custom error message.');
    console.log(req)
    console.log(err)
});

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

// Proxy for redirecting user panels
async function userProxy(ctx, next) {
    if (ctx.path.indexOf('\/id\/') > -1) {
        console.log('Earlier' + ctx.path)
        ctx.respond = false
        var reqid = ctx.path.split('/')

        var [ip, port] = machinepool.getipport(reqid[2])

        var targetUrl = "http://"+ ip + ":" + port
        console.log('Later: ' + targetUrl)
        
        // Forward body request
        ctx.req.body = ctx.request.body

        await proxy.web(ctx.req, ctx.res, { target: targetUrl })
    } else if (ctx.path.indexOf('\/notebook') > -1) {

        var targetUrl = "http://127.0.0.1:3001"

        // Forward body request
        ctx.req.body = ctx.request.body

        await proxy.web(ctx.req, ctx.res, { target: targetUrl })
     } else {
        await next()
    }
}

module.exports = {
    userProxy : userProxy,
    globalProxy: proxy
}
		
