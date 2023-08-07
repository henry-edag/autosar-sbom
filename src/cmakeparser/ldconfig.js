const {spawn} = require('child_process');

// /sbin/ldconfig -v
const getList = (cb) => {
    let result = '';
    const cp = spawn('/sbin/ldconfig', ['-v'], {cwd: process.cwd()});
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

const ldConfig = (cb) => {
    getList(s=>{
        let r = {};
        s.split(/[\r\n]+/).map(i=>{
            let [sName, sVersion] = i.trim().split(/\s+\-\>\s+/);
            let n = sName.replace(/\.so(\.\d*)*$/,'');
            let [,v] = (sVersion||'').match(/\.so\.(.+)$/)||[];
            if (!v) {
                const [,v2] = (sVersion||'').match(/\-([^-]+)\.so?$/)||[];
                if (/[.0-9]+/.test(v2)) {
                    n = n.replace(new RegExp(escapeRegExp(v2)+'$'), '');
                    v = v2;
                }
            }
            return {n, v:v || ''};
        }).filter(i=>i.v).forEach(i=>{
            r[i.n] = i.v;
        })
        cb(r);
    })
}

module.exports = {ldConfig};
