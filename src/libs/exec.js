const cproc = require('child_process');

const spawn = (cmd, args, cb, cwd = process.cwd()) => {
	let result = '';
	const cp = cproc.spawn(cmd, args, {cwd});
	cp.stdout.on('data', s => {
		result += s.toString();
		console.log('std out ==>', s.toString());
	});

	cp.stderr.on('data', s => {
		console.log('std err ==>', s.toString());
	});

	cp.on('exit', code => {
		// console.log('onExit ==>', code);
	});
	cp.on('error', s => {
		// console.log('onErr ==>', s);
	});
	cp.on('close', code => {
		// console.log('onClose ==>', code);
		cb && cb(result);
	});
};

const exec = (cmd, cb, cwd = process.cwd()) => {
	cproc.exec(cmd, {cwd}, (err, stdout, stderr) => {
		cb && cb(err, stdout, stderr);
	});
};

const execFile = (filePath, args, cb, cwd = process.cwd()) => {
	cproc.execFile(filePath, args, {cwd}, (err, stdout, stderr) => {
		cb && cb(err, stdout, stderr);
	});
};

module.exports = {spawn, exec, execFile};
