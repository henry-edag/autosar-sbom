const {spawn} = require('child_process');

// /sbin/ldconfig -v
const getList = (cb) => {
    let result = '';
    const cp = spawn('apt', ['list', '--installed'], {cwd: process.cwd()});
    cp.stdout.on('data', (s) => {
        result += s.toString();
        // console.log('std out ==>', s.toString());
    });

    cp.stderr.on('data', (s) => {
        // console.log('std err ==>', s.toString());
    });

    cp.on('exit', (code) => {
        // console.log('onExit ==>', code);
    });
    cp.on('error', (s) => {
        // console.log('onErr ==>', s);
    });
    cp.on('close', (code) => {
        // console.log('onClose ==>', code);
        cb(result);
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

const aptInstalled = (cb) => {
    getList(s=>{
        let r = {};
        s.split(/[\r\n]+/).filter(i=>!!i && i!=='Listing...').map(i=>{
            let [nm, ver, m, desc] = i.trim().split(/\s+/);
            let n = nm.replace(/\/[\w,-]+$/,'');
            let [,,v] = (ver||'').match(/^(\d:)?([\d\.]+)([\-+].*)?$/)||[];
            // return {n, v:v || ''};
            return {n, v, ver};
        }).forEach(i=>{
            const {n, v, ver} = i;
            r[n] = {v, ver};
        })
        cb(r);
    })
}

module.exports = {aptInstalled};
