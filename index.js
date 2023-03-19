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

function getIp(req) {
    return req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
}
handlers.common = function (req, res) {
    const ip = getIp(req);
    if (logging >= 3) console.log(ip + " requested " + req.url);
    return ip;
};

handlers.swarmlist = function (req, res) {
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

handlers.swarmcommand = function (req, res) {
    handlers.common(req, res);
    const ip = getIp(req);
    const checks = function () {
        if (auth_token && auth_token != req.query.token) {
            res.send({
                error: "invalid token"
            });
            return false;
        } else if (iplock && ip != db[req.params.swarmid].ip) {
            res.send({
                error: "ip mismatch"
            });
            return false;
        }
        return true;
    }
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
                if (!req.query.width || !req.query.length) {
                    res.send({
                        error: "missing parameters"
                    });
                    break;
                }
                db[req.params.swarmid] = {};
                const swarmConfig = {
                    time_created: new Date().getTime(),
                    width: req.query.width,
                    length: req.query.length,
                    ip: ip,
                    shafts: [],
                    travelData: [],
                    claimed: [],
                    done: []
                };
                // generate shaft list
                for (let i = 0; i < req.query.width; i++) {
                    for (let j = 0; j < req.query.length; j++) {
                        if (((i % 5) * 2 + j) % 5 == 0) swarmConfig.shafts.push({
                            x: i,
                            z: j
                        });
                    }
                }
                db[req.params.swarmid] = swarmConfig;
                savedb();
                res.send({
                    success: "swarm created",
                    shafts: db[req.params.swarmid].shafts.length
                });
                if (logging >= 1) console.log(ip + " created swarm '" + req.params.swarmid + "'");
                break;
            }

        // claim a shaft for a turtle
        case "claimshaft":
            {
                if (!checks()) {
                    break;
                } else if (!db[req.params.swarmid]) {
                    res.send({
                        error: "swarm does not exist"
                    });
                    break;
                } else if (req.query.id == undefined) {
                    res.send({
                        error: "missing parameters"
                    });
                    break;
                }
                const shaft = db[req.params.swarmid].shafts.shift();
                if (shaft) {
                    res.send({
                        success: shaft,
                        remaining: db[req.params.swarmid].shafts.length
                    });
                    shaft.claimed_time = new Date().getTime();
                    shaft.claimed_by = req.query.id;
                    db[req.params.swarmid].claimed.push(shaft);
                    if (logging >= 2) console.log("Shaft (" + shaft.x + ", " + shaft.z + ") claimed in swarm '" + req.params.swarmid + "' by turtle " + req.query.id + " (" + db[req.params.swarmid].shafts.length + " remaining)");
                    savedb();
                    break;
                }
                else {
                    res.send({
                        error: "no remaining shafts",
                        remaining: 0
                    });
                    break;
                }
            }

        // mark a shaft as finished
        case "finishedshaft":
            {
                if (!checks()) {
                    break;
                } else if (!db[req.params.swarmid]) {
                    res.send({
                        error: "swarm does not exist"
                    });
                    break;
                } else if (!(req.query.x && req.query.z)) {
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

        // add the specified location to the travel queue
        case "travel":
            {
                if (!checks()) {
                    break;
                } else if (!db[req.params.swarmid]) {
                    res.send({
                        error: "swarm does not exist"
                    });
                    break;
                } else if (req.query.id == undefined || req.query.destX == undefined || req.query.destY == undefined || req.query.destZ == undefined || req.query.startX == undefined || req.query.startY == undefined && req.query.startZ != undefined) {
                    res.send({
                        error: "missing parameters"
                    });
                    break;
                }

                const posData = {
                    dest: {
                        x: req.query.destX,
                        // y: req.query.destY,
                        z: req.query.destZ
                    },
                    start: {
                        x: req.query.fromX,
                        // y: req.query.fromY,
                        z: req.query.fromZ
                    }
                }

                // return true if line segments AB and CD intersect
                const intersect = function (A, B, C, D) {
                    const ccw = function (A, B, C) {
                        return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x)
                    }
                    return ccw(A, C, D) != ccw(B, C, D) && ccw(A, B, C) != ccw(A, B, D)
                }

                const travelData = db[req.params.swarmid].travelData;
                let intersectExists = false;
                for (let i = 0; i < travelData.length; i++) {
                    const t = travelData[i];
                    if (!t || i == req.query.id) { continue; } // skip if comparing to self
                    const a1 = {
                        x: posData.start.x,
                        y: posData.start.z
                    }
                    const b1 = {
                        x: posData.dest.x,
                        y: posData.start.z
                    }
                    const c1 = {
                        x: t.start.x,
                        y: t.start.z
                    }
                    const d1 = {
                        x: t.dest.x,
                        y: t.start.z
                    }

                    const a2 = {
                        x: posData.dest.x,
                        y: posData.start.z
                    }
                    const b2 = {
                        x: posData.dest.x,
                        y: posData.dest.z
                    }
                    const c2 = {
                        x: t.dest.x,
                        y: t.start.z
                    }
                    const d2 = {
                        x: t.dest.x,
                        y: t.dest.z
                    }

                    if (intersect(a1, b1, c1, d1) || intersect(a1, b1, c2, d2) || intersect(a2, b2, c1, d1) || intersect(a2, b2, c2, d2)) {
                        intersectExists = true;
                        break;
                    }
                }
                if (intersectExists) {
                    res.send({
                        error: "travel path intersects with queued path"
                    });
                    break;
                } else {
                    db[req.params.swarmid].travelData[req.query.id] = posData;
                    savedb();
                    res.send({
                        success: true
                    });
                }
                break;
            }

        // remove the specified location to the travel queue
        case "traveldone":
            {
                if (!checks()) {
                    break;
                } else if (!db[req.params.swarmid]) {
                    res.send({
                        error: "swarm does not exist"
                    });
                    break;
                } else if (req.query.id == undefined) {
                    res.send({
                        error: "missing parameters"
                    });
                    break;
                } else if (!db[req.params.swarmid].travelData[req.query.id]) {
                    res.send({
                        success: true,
                        error: "travel id not exist"
                    });
                    break;
                }
                db[req.params.swarmid].travelData[req.query.id] = null;
                savedb();
                res.send({
                    success: true
                });
                break;
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

    if (logging >= 1) console.log('Running swarm quarry host at port %s', port);
});