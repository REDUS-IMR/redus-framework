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
const machines = require("./machines.js")

// JSON escape
function jsonEscape(str)  {
    return str.replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "    ");
}

// Sanitize UUID
function validUUID(x) {
    if(x.match('[0-9a-fA-F]{8}.[0-9a-fA-F]{4}.[0-9a-fA-F]{4}.[0-9a-fA-F]{4}.[0-9a-fA-F]{12}') == x)
    	return true
    else
    	return false
}

// Sanitize alphanumeric
function validAlphaNum(x) {
    if(x.match('[0-9a-zA-Z]+') == x)
    	return true
    else
    	return false
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

	if(!(validAlphaNum(assID) && validAlphaNum(yrID))) {
		console.log("getConfig: Found invalid request data")
		return
	}

        let rawdata = fs.readFileSync('extra/' + assID + '-' + yrID + '.json', 'utf8');
        let config = JSON.parse(jsonEscape(rawdata));
        ctx.body = config
        return;
    }

    if (ctx.url.startsWith('/v1/getAssFiles')) {
        let assID = ctx.request.query.name
        let yrID = ctx.request.query.year

	if(!(validAlphaNum(assID) && validAlphaNum(yrID))) {
		console.log("getAssFiles: Found invalid request data")
		return
	}

        console.log("extra/" + assID + "-" + yrID + ".tgz")

        await send(ctx, "extra/" + assID + "-" + yrID + ".tgz")
        return;
    }

    if ('/v1/checkInit' == ctx.url) {
        let newid = body.id
        let status = [-1, -1, -1];
        let ipAddr = null

	ctx.body = { status: status, ipAddr: ipAddr}

	if(!validUUID(newid)) {
		console.log("checkInit: Found invalid request data")
		return
	}

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

	ctx.body = { status: status, ipAddr: ipAddr}

        return;
    }

    // Make new container
    if ('/v1/createNew' == ctx.url) {
        // Process config!
        const reqconfig = {"selection":body.selection, "config": body.config}

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

    // Delete container
    if ('/v1/destroyCurrent' == ctx.url) {

	if(!validUUID(body.id)) {
		console.log("destroyCurrent: Found invalid request data")
		return
	}

        // Getting ID
        let path = os.tmpdir() + "/" + body.id;

        // Go INIT!
        let ret = await machines.destroyMachineNop(body.id, path)

        ctx.body = { status: ret };
        return;
    }


    if (ctx.path === '/') {
        await send(ctx, "static/index.html")
        return;
    }
    await send(ctx, ctx.path, { root: __dirname + "/static" })
}

module.exports = respond;
