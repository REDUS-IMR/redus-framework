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

// Other packages
const fs = require('fs');
const os = require('os');
const send = require('koa-send')

// User modules
const initGlobal = require("./prepfile.js")

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

module.exports = respond;
