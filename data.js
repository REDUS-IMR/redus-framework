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



// Global variable for id to IP mapping
function f() {
    var idToip = []
    var idToport = []
    var startport = 8000
    var idinc = 0

    var Obj = new Object()

    function setipport(id, ip, port) {
	idToip[id] = ip
   	idToport[id] = port
    }

    function getipport(id) {
	return [idToip[id], idToport[id]]
    }

    function getnewport() {
        return startport + (idinc++);
    }

    Obj.setipport = setipport
    Obj.getipport = getipport
    Obj.getnewport = getnewport

    return Obj
}

init = new f()

module.exports = init;
