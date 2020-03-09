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
const util = require('util');

// User modules
const machines = require("./machines.js")
const globalConfig = require("./config.js")


// initGlobal function
async function initGlobal(id, path, config) {
        // Do machine creation and preparing file in parallel
        const [result1, result2] = await Promise.all([machines.createMachineNop(id, path), prepareFile(id, path, config)]);

        // Run machine (do it async)
        const result3 = machines.runVM(id, path)
}

// PrepareFile function

async function prepareFile(id, path, params) {
    const http = require('http');
    const targz = require('targz');

    var config = params.config
    var selection = params.selection
    
    // Stats
    let filePrepared = false

    console.log("Preparing file -- Start")
    // Configuration
    console.log(selection)


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
    const src = 'http://' + globalConfig.serverIp + ':' + globalConfig.serverPort + '/v1/getAssFiles?name=' + selection.name + "&year=" + selection.year;
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



    if(config != null) {
            // Configuration
        console.log(config)

        // Prepare conf directory 
        // TODO: use conf
        confPath = path + "/docker-redus-pipeline/projects/" + selection.name + "-" + selection.year + "/redus"

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
            if(element.process!='asis') {
                var srcdata = ''

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

                    // Get source
                    var parseString = require('xml2js').parseString;
                    parseString(element.buildParameters, function (err, result) {
                        element.remoteSource = result.redus_master.parameters[0].configuration[0].stsName[0]
                    });

                    // Write config
                    buildConf = "redus/" + fleet + ".xml"
                }else if(element.process == 'manual') {
                    sourceAge = true
                    sourceYear = true
                    buildConf = ''
                    srcdata = element.data
                    srcdatavar = element.data_var
                }

                prefix = 'survey.update.'
                txtTemplate.default[prefix + iter + '.mode'] = element.process
                txtTemplate.default[prefix + iter + '.data'] = srcdata
                txtTemplate.default[prefix + iter + '.data_var'] = srcdatavar
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

module.exports = initGlobal;
