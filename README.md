# REDUS FRAMEWORK

## Description

This repository contains the cloud-based REDUS framework's backend and frontend systems.

The frontend provides user with the framework's runtime configuration and control, as well as a set of "live" panels that connect directly into the framework's docker machine. The current available panels are the file manager, console terminal, and log viewers. The frontend system uses Vue.js, Bootstrap + Vue, and axios HTTP client.

The backend system responsible for generating runtime configurations for the framework, creating docker machines and starting them, and providing http/websocket proxy tunnels to make file manager, console terminal, and log viewers available to the users. The backend system utilizes NodeJS, Docker, and Docker Machine.

## Requirements:

1. Node.js
2. Docker
3. Docker Machine
4. VirtualBox (for the docker machine. Openstack can be use as an alternative)

## How to run

1. Clone the repository
2. `npm install`
3. `npm start`
4. Go to `http://localhost:3000/` with your favourite browser

## License

Please see the `LICENSE` file.

Copyright (C) 2019 Ibrahim Umar and the REDUS IMR Norway team (http://redus.no).