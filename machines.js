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


// Docker machine CLI
//const DockerMachineCLI = require('dockermachine-cli-js');
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

const DMkeyValueObject = {
    'driver': 'kvm',
    'kvm-memory' : '2048'
}

// Docker CLI
var dockerCLI = require('docker-cli-js');

var DockerOptions = dockerCLI.Options;
var Docker = dockerCLI.Docker;
*/

// Other packages
const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

var machinepool = require("./data.js")


// Create machine for Podman
async function createMachineNop(id, path) {

    console.log("Creating machine -- Start")

    // Define port
    var vmPort = machinepool.getnewport()
    machinepool.setipport(id, "127.0.0.1",  vmPort)

    fs.writeFileSync(path + "/" + "prepareVM.status", "1");
    fs.writeFileSync(path + "/" + "VM.IP", "127.0.0.1");

    console.log("Creating machine -- Finish")
    return(["127.0.0.1"])
}

// Create machine for Docker-machine (or Kubernetes)
async function createMachine(id, path) {

    // Stats
    let vmCreateFail = false;
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
    machinepool.setipport(id, vmIP,  8888)

    console.log("Creating machine -- Finish")

    return([vmIP])
}

async function runVM(id, path) {

    let vmStarted = false

    console.log("Starting VM -- start")

    let dockerfilePath = path + "/docker-redus-pipeline"
/*
    var options = new DockerOptions(
        id,
        dockerfilePath
    );

    var docker = new Docker(options);
*/
    let data

    // Build image
    try {
         data = await exec('podman build --pull --rm -t ' + id + ' .',  {
                           cwd: dockerfilePath
                         })
    } catch (err) {
        if(err) {
            console.log(err);
            fs.writeFileSync(path + "/" + "startVM.status", "2");
            return ([vmStarted])
        }
    }

    console.log('data = ', data.stdout);

    // Get port
    var [vmIp, vmPort] = machinepool.getipport(id)
    
    try {
        data = await exec('podman run --name ' + id + '-run -p ' + vmPort + ':8888 -dit ' + id, {
                           cwd: dockerfilePath
                         })
    } catch (err) {
        if(err) {
            console.log(err);
            fs.writeFileSync(path + "/" + "startVM.status", "2");
            return ([vmStarted])
        }
    }

    console.log('data = ', data.stdout);

    vmStarted = true

    fs.writeFileSync(path + "/" + "startVM.status", "1");

    console.log("Starting VM -- finish")

    return ([vmStarted])
}

module.exports = {
    runVM: runVM,
    createMachine: createMachine,
    createMachineNop: createMachineNop
}

