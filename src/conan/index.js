const fs = require('fs');
const path = require('path');
const {spawn, execFile} = require('../libs/exec');

const conanEnv = 'conan-env';
const conanEnvParent = process.cwd();
const conanEnvPath = path.join(conanEnvParent, conanEnv);

const cyclonedxConanPath = path.join(conanEnvParent, 'cyclonedx-conan');
const cyclonedxConanRepo = 'https://github.com/CycloneDX/cyclonedx-conan.git';

const initConanEnv = () =>
	new Promise((rs, rj) => {
		if (!fs.existsSync(conanEnvPath)) {
			spawn(
				'python3',
				['-m', 'venv', conanEnv],
				() => {
					console.log('venv created');
					rs(true);
				},
				conanEnvParent
			);
		} else {
			console.log('venv ready');
			rs(true);
		}
	});

const installCycloneConan = () =>
	new Promise((rs, rj) => {
		if (!fs.existsSync(path.join(conanEnvPath, 'bin/cyclonedx-conan'))) {
			console.log('install cyclonedx-conan...');

			const envPip = path.join(conanEnvPath, 'bin/pip');
			console.log('envPip:', envPip);
			execFile(
				envPip,
				['install', '-e', '.'],
				(err, stdout, stderr) => {
					err && console.log('err ==>', err.toString());
					stdout && console.log('stdout ==>', stdout.toString());
					stderr && console.log('stderr ==>', stderr.toString());
					rs(true);
				},
				cyclonedxConanPath
			);
		} else {
			console.log('cyclonedx-conan has been installed');
			rs(true);
		}
	});

const initCycloneConanRepo = () =>
	new Promise((rs, rj) => {
		if (!fs.existsSync(cyclonedxConanPath)) {
			spawn(
				'git',
				['clone', cyclonedxConanRepo],
				() => {
					console.log('cyclonedx-conan repo cloned');
					rs(true);
				},
				conanEnvParent
			);
		} else {
			console.log('cyclonedx-conan exists');
			rs(true);
		}
	});

const createSBOM = projectRoot =>
	new Promise((rs, rj) => {
		const envCyCon = path.join(conanEnvPath, 'bin/cyclonedx-conan');
		console.log('envCyCon:', envCyCon);
		let r = '';
		execFile(envCyCon, ['-b', 'path_or_reference', projectRoot], (err, stdout, stderr) => {
			err && console.log('err ==>', err.toString());
			stdout && (r = stdout.toString());
			r && console.log('stdout ==>', r);
			stderr && console.log('stderr ==>', stderr.toString());
			rs(r);
		});
	});

const doConan = projectRoot => {
	return initConanEnv()
		.then(() => initCycloneConanRepo())
		.then(() => installCycloneConan())
		.then(() => createSBOM(projectRoot))
		.then((s = '') => {
			const m = s.match(/[\r\n]+\{[\r\n]+/);
			if (m) {
				return s.substr(m.index);
			}
			return false;
		});
};

module.exports = {doConan};
