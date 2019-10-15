/*
    This file is part of REDUS Framework from IMR Norway.

    Copyright (C) 2019 Ibrahim Umar and the REDUS IMR Norway team

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

// Global info

var baseurl = window.location.origin + "/v1"

// Global shared store
var store = {
    debug: true,
    state: {
        phase: 1,
        id: "",
        remoteAddr: "",
        globalLoading: false,
        subprocCreateVM: -1,
        subprocPrepareFiles: -1,
        subprocLaunchVM: -1,
        url1: "",
        url2: "",
        url3: ""
    },
    nextPhaseAction() {
        this.state.phase = this.state.phase + 1
        if (this.debug) console.log('Next phase is triggered, now is: ', this.state.phase)
    },
    resetPhaseAction() {
        if (this.debug) console.log('Phase is cleared')
        this.state.phase = 1
    },
    setIDAction(newid) {
        if (this.debug) console.log('ID is set to: ' + newid)
        this.state.id = newid
    },
    resetIDAction() {
        if (this.debug) console.log('ID is reset')
        this.state.id = ""
    },
    startLoading() {
        if (this.debug) console.log('Loading start')
        this.state.globalLoading = true
    },
    finishLoading() {
        if (this.debug) console.log('Loading end')
        this.state.globalLoading = false
        //this.resetSubProc()
    },
    resetSubProc() {
        if (this.debug) console.log('Resetting sub-process indicator')
        this.state.subprocCreateVM = -1
        this.state.subprocPrepareFiles = -1
        this.state.subprocLaunchVM = -1
    },
    setAddrAction(addr) {
        if (this.debug) console.log('Setting address')
        this.state.remoteAddr = addr
    },
    populateURLs() {
        var prefix = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '');
        this.state.url1 = prefix + '/id/' + this.state.id + '/p/workspace/';
        this.state.url2 = prefix + '/id/' + this.state.id + '/p/terminal';
        this.state.url3 = prefix + '/id/' + this.state.id + '/p/logs';
    },
    resetAddrAction() {
        if (this.debug) console.log('Resetting address')
        this.state.remoteAddr = ""
    }

}

// Assessment selection
var assSelect = new Vue({
    el: '#ass-select',
    data: {
        visible: true,
        curr: [],
        notValid: true,
        assessmentTitles: [
            { text: '', id: '' },
            { text: 'North East Arctic Cod', id: 'neacod' },
            { text: 'North East Arctic Haddock', id: 'neahad' },
        ],
        initYear: [
            { text: '' },
        ],
        emptyYear: [
            { text: '' },
        ],
        neacodYear: [
            { text: '' },
            { text: '2018' },
        ],
        neahadYear: [
            { text: '' },
        ]
    },
    methods: {
        changeAss: function (event) {
            this.curr.ass = event.target.value
            if (event.target.value == "neacod") {
                this.initYear = this.neacodYear
            } else if (event.target.value == "neahad") {
                this.initYear = this.neahadYear
            } else {
                this.initYear = this.emptyYear
            }
        },
        checkValid: function (event) {
            this.curr.year = event.target.value
            if (this.curr.ass != '' && this.curr.year != '') {
                this.notValid = false
            } else {
                this.notValid = true
            }
        },
        startProcess: function () {
            // TODO: Start all process (get ID, start docker, get IP, etc.)
            store.startLoading()

            // Get an ID from server
            axios
            .post(baseurl + "/createNew")
            .then(response => {
                store.setIDAction(response.data.id)
            })
            .catch(error => {
                console.log(error)
                //TODO, proper error message
            })
            .finally(() => console.log("Finish"))

            // Hide the selector
            this.visible = false
            // Get to the next phase of the app
            store.nextPhaseAction();
        },
        changeProcess: function () {
            this.$bvModal.msgBoxConfirm('Are you sure you want to change? The current running process will be stopped and all data will be destroyed.')
            .then(value => {
                // TODO: Stop all process (docker, etc.)
                if (value == true) {
                    store.resetPhaseAction();
                    store.resetIDAction();
                    store.resetAddrAction();
                    this.notValid = true;
                    this.visible = value;
                }
            })
            .catch(err => {
                // An error occurred
            })
            //this.visible = true
        }
    }
})

// Runtime view
var runTime = new Vue({
    el: '#runtime',
    data: {
        state: store.state
    }
})


// Modal
var loading = new Vue({
    el: '#modalLoading',
    data: {
        state: store.state,
    },
    methods: {
        loadData: function () {

            // Only check when loading modal is active
            if (!this.state.globalLoading) return;
            // Is VM created
            axios
            .post(baseurl + "/checkInit", {
                id: this.state.id
            })
            .then(response => {
                // TODO: Update parent
                this.state.subprocCreateVM = response.data.status[0]
		        this.state.subprocPrepareFiles = response.data.status[1]
		        this.state.subprocLaunchVM = response.data.status[2]
                if(this.state.subprocLaunchVM == 1) {
                    store.setAddrAction(response.data.ipAddr)
                    store.populateURLs()
                    store.finishLoading()
                }
            })
            .catch(error => {
                console.log(error)
                //TODO, proper error message
            })
            .finally(() => console.log("checkVM Finish"))
        }
    },
    mounted: function () {
        setInterval(function () {
            this.loadData();
        }.bind(this), 10000);
    }
})

