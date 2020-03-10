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
        url0: "",      
        url1: "",
        url2: "",
        url3: "",
        url4: "",
        url5: ""
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
	    this.state.url0 = prefix + '/id/' + this.state.id + '/p/status';
        this.state.url1 = prefix + '/id/' + this.state.id + '/p/workspace/';
        this.state.url2 = prefix + '/id/' + this.state.id + '/p/terminal';
        this.state.url3 = prefix + '/id/' + this.state.id + '/p/logs';
    },
    resetURLs() {
        this.state.url0 = '';
        this.state.url1 = '';
        this.state.url2 = '';
        this.state.url3 = '';
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
        configAvailable: false,
        curr: [],
        notValid: true,
        reRenderEntries: 0,
	availableCatchProcess: [
            { text: 'As Is', value: 'asis' },
            { text: 'Input manual values', value: 'manual' },
        ],
        availableSurveyProcess: [
            { text: 'As Is', value: 'asis' },
            { text: '(Official) Pre-computed values', value: 'remote' },
            { text: 'Re-process using StoX', value: 'build' },
            { text: 'Input manual values', value: 'manual' },
        ],
	availableModel: [
            { text: 'As Is', value: 'asis' },
            { text: 'Latest SAM', value: 'sam' },
            { text: 'Latest XSAM', value: 'xsam' },
        ],
	stsList:[
            "Barents Sea Beaked redfish and Sebastes sp in Subareas I and II bottom trawl index in winter",
            "Barents Sea Blue whiting bottom trawl index in winter",
            "Barents Sea Golden redfish in Subareas I and II bottom trawl index in winter",
            "Barents Sea Northeast Arctic cod bottom trawl index in winter",
            "Barents Sea Northeast Arctic Greenland halibut bottom trawl index in winter",
            "Barents Sea Northeast Arctic haddock bottom trawl index in winter",
            "Barents Sea Norway redfish bottom trawl index in winter",
            "North Sea NOR lesser sandeel acoustic abundance estimate in spring",
            "North Sea Skagerrak Northern Shrimp Bottom Trawl Index",
            "Norwegian Sea NOR Norwegian spring-spawning herring acoustic abundance index in Feb-Mar",
            "Varanger Stad Northeast Arctic saithe acoustic index in autumn",
            "Barents Sea Northeast Arctic cod acoustic index in winter",
            "Barents Sea Northeast Arctic haddock acoustic index in winter"
        ],
        assessmentTitles: [
            { text: 'North East Arctic Cod', id: 'neacod' },
            { text: 'Norwegian Sea Herring', id: 'nsher' },
        ],
        initYear: [],
        neacodYear: [
            { text: '2018' },
        ],
        nsherYear: [
            { text: '2019' },
        ]
    },
    mounted: function () {
        this.$nextTick(function () {
            var queryString = window.location.search;
            var urlParams = new URLSearchParams(queryString);

            var runid = urlParams.get('runid')

            if(runid != null && runid != ""){
                // TODO check valid user and runid first
                // TODO populate survey and year string
                store.startLoading()
                store.setIDAction(runid)
                // Hide the selector
                this.visible = false
                // Get to the next phase of the app
                store.nextPhaseAction();
            }
        })
    },
    methods: {
        surveyProcessChange: function(event) {
            selectedValue = event.target.value;
            textId = event.target.id.split('_')[0]+'_surveytext'
            textEl = document.getElementById(textId)
            this.reRenderEntries += 1

        },
        getsurveyTitle: function() {
            if(typeof this.curr.config != 'undefined' && typeof this.curr.config.survey.surveyName != 'undefined')
                return this.curr.config.survey.surveyName
            else
                return ""
        },
        getsurveyEntries: function() {
            if(typeof this.curr.config != 'undefined' && typeof this.curr.config.survey.entries != 'undefined')
                return  this.curr.config.survey.entries
            else
                return ""
        },
        changeAss: function (event) {
            if (event.target.value != '') {
                this.curr.ass = event.target.value
                this.initYear = this[this.curr.ass + "Year"]
            } else {
                this.initYear = []
            }
            this.curr.year = ''
            
            this.checkValid()
        },
        changeYear: function(event) {
            this.curr.year = event.target.value
            this.checkValid()
        },
        checkValid: function () {
            if (this.curr.ass == '' || this.curr.year == '') {
                this.notValid = true
            } else {
                var found = this[this.curr.ass + "Year"].findIndex(x => x.text === this.curr.year)
                if(found >= 0) {
                    this.notValid = false
                } else {
                    this.notValid = true
                }
            }
        },
        startProcess: function () {

            store.startLoading()

            // Get an ID from server
            axios
            .post(baseurl + "/createNew", {selection: {"name": this.curr.ass, "year": this.curr.year}, config: this.curr.config})
            .then(response => {
                store.setIDAction(response.data.id)
            })
            .catch(error => {
                console.log(error)
            })
            .finally(() => console.log("Finish"))

            // Hide the selector
            this.visible = false
            // Get to the next phase of the app
            store.nextPhaseAction();
        },
        changeProcess: function () {
            this.$bvModal.msgBoxConfirm('Are you sure you want to change process?')
            .then(value => {
                // TODO: Stop all process (docker, etc.)
                if (value == true) {
                    store.resetIDAction();
                    store.resetPhaseAction();
                    store.resetAddrAction();
                    store.resetSubProc();
                    store.resetURLs(); 
                    this.notValid = true;
                    this.visible = value;
                }
            })
            .catch(err => {
                console.log(error)
            })
        },
        destroyProcess: function () {
            // Destroy using ID
            this.$bvModal.msgBoxConfirm('Are you sure you want to destroy? The current running process will be stopped and all data will be destroyed.')
            .then(value => {
                // TODO: Stop all process (docker, etc.)
                if (value == true) {
                    let current = store.state.id
 		    store.resetIDAction();
                    store.resetPhaseAction();
                    store.resetAddrAction();
                    store.resetSubProc();
                    store.resetURLs();
                    this.notValid = true;
                    this.visible = value;
                    axios
                    .post(baseurl + "/destroyCurrent", {id: current})
                    .then(response => {
                        console.log(response.data)
                    })
                    .catch(error => {
                        console.log(error)
                    })
                    .finally(() => console.log("Finish Destroy"))
                }
            })
            .catch(err => {
                console.log(error)
            })
        },
        startConfig: function () {
            // TODO: Start all process (get ID, start docker, get IP, etc.)
            //store.startLoading()

            // Get an ID from server
            axios
            .post(baseurl + "/getConfig", {
                assID: this.curr.ass,
                assYR: this.curr.year,
            })
            .then(response => {
                this.curr.config = response.data.config
                this.configAvailable = true
            })
            .catch(error => {
                console.log(error)
            })
            .finally(() => console.log("Opening config panel..."))
        },
    }
})

// Runtime view
var runTime = new Vue({
    el: '#runtime',
    data: {
        state: store.state,
	    status: "Initializing",
        statusled: "led-blue",
        notfinish: true
    },
    computed: {
         directLink: function () {
            return window.location.origin + "/?runid=" + this.state.id
         }
    },
    methods: {
        refreshBelow: function(x, no) {
            //alert("refreshing:" + x);
            x.src = '';
            x.src = this.state["url" + no]
        },
        getStatus: function () {
            // Only check when VM is active
            if (this.state.subprocLaunchVM != 1) return;

            // Get status
            axios
            .get(this.state.url0)
            .then(response => {
			if(response.data.name == "all") {
				this.status = "Running";
				this.statusled = "led-yellow"
			 } else {
				console.log(response.data)
				// Show up report
				var prefix = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '');
                this.state.url4 = prefix + '/id/' + this.state.id + '/p/report';
                this.state.url5 = prefix + '/id/' + this.state.id + '/p/artifacts';
                
                var redustot = response.data.redus.reduce(function(total, num){return total + num})
                var assesstot = response.data.assessement.reduce(function(total, num){return total + num})

                if(redustot + assesstot == 0) {
                    this.status = "Successfully finished";
                    this.statusled = "led-green";
                    this.notfinish = false;
                } else {
                    this.status = "Finished with error!";
				    this.statusled = "led-red";
                }
			}
            })
            .catch(error => {
                console.log(error)
            })
            .finally(() => console.log("checkStatus Finish"))
        },
    },
    mounted: function () {
        setInterval(function () {
            this.getStatus();
        }.bind(this), 5000);
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
                this.state.subprocCreateVM = response.data.status[0];
                this.state.subprocPrepareFiles = response.data.status[1];
                this.state.subprocLaunchVM = response.data.status[2];
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
        }.bind(this), 5000);
    }
})

