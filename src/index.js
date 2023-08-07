const path = require('path');
const fs = require('fs');
// const os = require('os');
const {parseRoot, ldConfig, aptInstalled} = require('./cmakeparser/index');
const {doConan} = require('./conan/index');
const {runService} = require('./libs/service');
const port = process.argv[3] || '8081';

// console.log('process.platform ==>', os.platform());
// console.log('process.platform ==>', os.type());
// console.log('process.platform ==>', os.machine());
// console.log('process.platform ==>', os.release());
// console.log('process.platform ==>', os.version());

// const p = __dirname + '/' + '../../sep-development (1)/sep-development/';
// console.log(path.resolve(p));

let projectRoot;
let mainFile;

const fn = process.argv[2];
// console.log('fn ===>', process.argv);
if (!fs.existsSync(fn)) {
	console.log('project path not found');
	process.exit();
}

const stat = fs.statSync(fn);
if (!stat.isDirectory()) {
	projectRoot = path.dirname(fn);
	mainFile = path.basename(fn);
} else {
	projectRoot = fn;
}

const outDir = path.resolve(__dirname, '../output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

if (fs.existsSync(path.join(projectRoot, 'conanfile.py'))) {
	doConan(projectRoot).then(s => {
		const sbomPath = path.join(outDir, './sbom.json');
		fs.writeFileSync(sbomPath, s);
		runService(sbomPath, port);
	});
} else {
	let packages = [];
	let projectName;
	let projectVersion;
	parseRoot(
		projectRoot,
		r => {
			packages = [...packages, ...r.packages];
			if (!projectName && r.projectName) projectName = r.projectName;
			if (!projectVersion && r.projectVersion) projectVersion = r.projectVersion;

			fs.writeFileSync(path.join(outDir, './pkg.json'), JSON.stringify(packages, null, 4));
			console.log('pkg.');
		},
		mainFile
	);

	// ldconfig
	ldConfig(ld => {
		fs.writeFileSync(path.join(outDir, './ld.json'), JSON.stringify(ld, null, 4));
		console.log('ld.');

		// installed
		aptInstalled(ir => {
			fs.writeFileSync(path.join(outDir, './apt.json'), JSON.stringify(ir, null, 4));
			console.log('apt.');

			console.log('projectName:', projectName);
			console.log('projectVersion:', projectVersion);

			const deps = {};
			for (let i of packages) {
				Object.entries(ld)
					.filter(([k, v]) => k.toLowerCase().includes(i.toLowerCase()))
					.forEach(([k, v]) => {
						deps[k] = v;
					});
				Object.entries(ir)
					.filter(([k, v]) => k.toLowerCase().includes(i.toLowerCase()))
					.forEach(([k, v]) => {
						deps[k] = v.v;
					});
			}
			const sbomPath = path.join(outDir, './sbom.json');
			fs.writeFileSync(
				sbomPath,
				JSON.stringify(
					{
						bomFormat: 'CycloneDX',
						specVersion: '1.3',
						// serialNumber: 'urn:uuid:d0afde2b-5039-4249-b79e-cb0235f5ab22',
						version: 1,
						metadata: {
							component: {
								'bom-ref': `${projectName || 'unknown'}@${projectVersion || '0.0.0'}`,
								type: 'application',
								name: projectName || 'unknown',
								version: projectVersion || '0.0.0',
							},
						},
						components: Object.entries(deps).map(([k, v]) => ({
							'bom-ref': `pkg:conan/${k}@${v}?repository_url=localhost`,
							type: 'library',
							name: k,
							version: v,
							purl: `pkg:conan/${k}@${v}?repository_url=localhost`,
						})),
						dependencies: [],
					},
					null,
					4
				)
			);
			runService(sbomPath, port);
		});
	});
}
