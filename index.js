require('dotenv').config()
/******************
 *  Basic Config   *
 ******************/

// Logging levels:
// 0 - no logging
// 1 - low logging - log important events (swarm creation, swarm completion, etc) and errors
// 2 - high logging - log almost everything
// 3 - max logging - log everything
// default: 1
const logging = process.env.LOG_LEVEL;

// Authentication
// Since this is stored in plain text, do not use a password you use elsewhere - this is
//  intended to be a BASIC authentication system and is NOT secure!
// Set to an empty string to disable authentication
const auth_token = process.env.PASSWORD || "";

/******************
 * Advanced Config *
 ******************/

// JSON data file
// The file that JSON will be read from and written to
// default: data.json
const dbfile = "data.json";

// Port to run on
// default: PORT environment variable or 8080
const port = process.env.PORT || 8080;

// IP Locking
// If true, will only allow commands to be run by the IP that created the specified swarm
// This can be used to mitigate 'griefing' by controlling someone's swarm
// default: true
const iplock = process.env.IP_LOCK || true;

/******************
 *       Code      *
 *  Don't change!  *
 ******************/

const express = require("express");
const fs = require("fs");
const jsf = require("jsonfile");
const path = require('path');
const app = express();

app.use(express.static('frontend/dist'))
app.use(require('cors')())

let db;

function savedb() {
    jsf.writeFile(dbfile, db, function (e) {
        if (e && logging >= 1) console.error("WARNING - Error writing database: " + e);
    });
}

// Initialize database
if (logging >= 2) console.log("Loading database");
try {
    fs.lstatSync(dbfile);
    db = jsf.readFileSync(dbfile);
}
catch (e) {
    // File missing or invalid json
    if (logging >= 1) console.log("WARNING - Database file missing or corrupt - creating empty DB");
    db = {};
    savedb();
}

const handlers = {};

handlers.common = function (req, res) {
    const ip = getIp(req);

    if (logging >= 3) {
        console.log(ip + " requested " + req.url);
    }
};

handlers.swarmlist = function (req, res) {
    handlers.common(req, res);
    //res.send("swarm list requested")
    const ip = getIp(req);
    res.send({
        success: Object.keys(db)
    });
    if (logging >= 2) console.log(ip + " requested swarm list");
};

handlers.swarminfo = function (req, res) {
    handlers.common(req, res);

    const swarmId = req.params.swarmid;

    if (swarmId in db) {
        const safeData = db[swarmId]
        //remove IP
        delete safeData.ip
        res.send({ success: { [swarmId]: safeData } })
    } else {
        res.send({ error: { message: "Invalid swarm" } })
    }

};

function getIp(req) {
    return req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
}

handlers.swarmcommand = function (req, res) {
    handlers.common(req, res);
    //res.send("swarm command requested");

    const ip = getIp(req);

    switch (req.params.swarmcommand) {
        // create a new swarm entry in the database
        case "create":
            {
                if (auth_token && auth_token != req.query.token) {
                    res.send({
                        error: "invalid token"
                    });
                    break;
                }
                if (db[req.params.swarmid]) {
                    res.send({
                        error: "swarm exists"
                    });
                    break;
                }
                if (!req.query.w || !req.query.h) {
                    res.send({
                        error: "missing parameters"
                    });
                    break;
                }
                db[req.params.swarmid] = {};
                const swarmConfig = {
                    time_created: new Date().getTime(),
                    w: req.query.w,
                    h: req.query.h,
                    ip: ip,
                    shafts: [],
                    claimed: [],
                    done: []
                };
                for (let i = 0; i < req.query.w; i++) {
                    for (let j = 0; j < req.query.h; j++) {
                        if (((i % 5) * 2 + j) % 5 == 0) {
                            swarmConfig.shafts.push({
                                x: i,
                                z: j
                            });
                        }
                    }
                }
                db[req.params.swarmid] = swarmConfig;
                savedb();
                res.send({
                    success: "swarm created",
                    shafts: db[req.params.swarmid].shafts.length
                });
                if (logging >= 1) {
                    console.log(ip + " created swarm '" + req.params.swarmid + "'");
                }
                break;
            }

        // claim a shaft for a turtle
        case "claimshaft":
            {
                if (auth_token && auth_token != req.query.token) {
                    res.send({
                        error: "invalid token"
                    });
                    break;
                }
                if (iplock && ip != db[req.params.swarmid].ip) {
                    res.send({
                        error: "ip mismatch"
                    });
                    break;
                }
                if (!db[req.params.swarmid]) {
                    res.send({
                        error: "swarm does not exist"
                    });
                    break;
                }
                if (!req.query.id) {
                    res.send({
                        error: "missing parameters"
                    });
                    break;
                }
                let shaft = db[req.params.swarmid].shafts.shift();
                if (shaft) {
                    res.send({
                        success: shaft,
                        done: (db[req.params.swarmid].shafts.length == 0)
                    });
                    shaft.claimed_time = new Date().getTime();
                    shaft.claimed_by = req.query.id;
                    db[req.params.swarmid].claimed.push(shaft);
                    savedb();
                    if (logging >= 2) {
                        console.log("Shaft (" + shaft.x + ", " + shaft.z + ") claimed in swarm '" + req.params.swarmid + "' by turtle " + req.query.id);
                    }
                    break;
                }
                else {
                    res.send({
                        error: "no remaining shafts",
                        done: true
                    });
                    break;
                }
            }

        // mark a shaft as finished
        case "finishedshaft":
            {
                if (auth_token && auth_token != req.query.token) {
                    res.send({
                        error: "invalid token"
                    });
                    break;
                }
                if (iplock && ip != db[req.params.swarmid].ip) {
                    res.send({
                        error: "ip mismatch"
                    });
                    break;
                }
                if (!db[req.params.swarmid]) {
                    res.send({
                        error: "swarm does not exist"
                    });
                    break;
                }
                if (!(req.query.x && req.query.z)) {
                    res.send({
                        error: "missing parameters"
                    });
                    break;
                }
                const x = Number(req.query.x);
                const z = Number(req.query.z);
                let index = -1;
                for (let i = 0; i <= db[req.params.swarmid].claimed.length; i++) {
                    const tmpshaft = db[req.params.swarmid].claimed[i];
                    if (tmpshaft && tmpshaft.x == x && tmpshaft.z == z) {
                        index = i;
                        break;
                    }
                }
                if (index != -1) {
                    const shaft = db[req.params.swarmid].claimed.splice(index, 1)[0];
                    shaft.completed_time = new Date().getTime();
                    db[req.params.swarmid].done.push(shaft);
                    res.send({
                        success: true
                    });
                    if (logging >= 2) {
                        console.log("Shaft (" + shaft.x + ", " + shaft.z + ") finished in swarm '" + req.params.swarmid + "' by turtle " + shaft.claimed_by);
                    }
                    savedb();
                    break;
                }
                else {
                    res.send({
                        error: "shaft not found"
                    });
                    break;
                }
            }

        default:
            {
                res.send({
                    error: "unrecognized command"
                });
                break;
            }
    }
};

// Web CP (todo)
// app.get('/', handlers.root);
app.get('/', (req, res) => {
    handlers.common(req, res);
    res.sendFile(path.resolve(__dirname, 'frontend', 'dist', 'index.html'));
});

// Swarm List
app.get('/swarm/', handlers.swarmlist);
// Info about specified swarm
app.get('/swarm/:swarmid/', handlers.swarminfo);
// Run a command on specified swarm
app.get('/swarm/:swarmid/:swarmcommand/', handlers.swarmcommand);


const server = app.listen(port, function () {
    const host = server.address().address;
    const port = server.address().port;

    if (logging >= 1) {
        console.log('Running swarm quarry host at port %s', port);
    }
});
