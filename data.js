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

const globalConfig = require("./config.js")


// Global variable for id to IP mapping
function f() {
    var idToip = []
    var idToport = []
    var idinc = 0

    var Obj = new Object()

    function newmachinedatarootless(id, ip) {

        idinc++

        var port =  globalConfig.userportstart + idinc

        idToip[id] = ip
        idToport[id] = port

        return [idinc, port]
    }

    function newmachinedatarootfull(id, ip, port) {

        idinc++

        idToip[id] = ip
        idToport[id] = port

        return idinc
    }

    

    function getipport(id) {
	return [idToip[id], idToport[id]]
    }

    Obj.newmachinedatarootless = newmachinedatarootless
    Obj.newmachinedatarootfull = newmachinedatarootfull

    Obj.getipport = getipport
    
    return Obj
}

init = new f()

module.exports = init;
