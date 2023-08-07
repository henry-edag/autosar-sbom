var CMake = require('peg-cmake');
var fs = require('fs');
var path = require('path');

function traversAST(ast, matcher) {
	ast.forEach(element => {
		if (!element.type) {
			// console.log('nt ==> ', element)
		} else if (matcher[element.type]) {
			matcher[element.type](element);
		} else if (!['newline', 'line_comment'].includes(element.type)) {
			console.log('skip ==> ', element.type);
		}
	});
}

class Visitor {
	constructor(func) {
		this._func = func;
		this.macro = this._func;
		this.function = this._func;
		this.command_invocation = this._func;
		this.if = elt => {
			traversAST(elt.body, this);
			// elt.elseif.foreach((e)=>{traversAST(elt.body, this);});
			if (elt.else) traversAST(elt.else.body, this);
		};
	}
}

const verRe = /\$\{(\w+)}/;

const getVarValue = (value, ref1, ref2 = {}) =>
	value.replaceAll(/\$\{(\w+)}/g, h => {
		const [, k] = h.match(verRe) || [];
		return ref1[k] || ref2[k] || h;
	});

let _ast = 1;

const parseRoot = (rootPath, cb, mainFile) => {
	let vars = {};
	let modelPath = [];
	let packages = [];
	let projectName;
	let projectVersion;

	const parse = (filePath, projectRoot = '') => {
		const curPath = path.dirname(filePath);
		const _projectRoot = projectRoot || curPath;
		let CMAKE_SOURCE_DIR = _projectRoot;
		let CMAKE_BINARY_DIR = _projectRoot; // process.cwd(), // https://home.cc.umanitoba.ca/~psgendb/doc/local/pkg/CASAVA_v1.8.2-build/bootstrap/doc/cmake-2.8/cmake-variables.html#variable:CMAKE_BINARY_DIR

		!vars.CMAKE_SOURCE_DIR && (vars.CMAKE_SOURCE_DIR = CMAKE_SOURCE_DIR);
		!vars.CMAKE_BINARY_DIR && (vars.CMAKE_BINARY_DIR = CMAKE_BINARY_DIR);

		const data = fs.readFileSync(filePath, 'utf8');
		const ast = CMake.parse(data);

		// save ast
		// fs.writeFileSync(`output/ast${_ast++}.json`, JSON.stringify(ast, null, 4));

		traversAST(
			ast,
			new Visitor(el => {
				if (el.type === 'command_invocation') {
					const elArguments = (el.arguments || []).filter(a => a.type !== 'newline');
					if (el.identifier.value === 'set') {
						// handle vars
						vars[elArguments[0]?.value] = getVarValue(elArguments[1]?.value, vars);
					} else if (el.identifier.value === 'project') {
						// handle project
						projectName = elArguments[0]?.value;
						if ((elArguments[1]?.value || '').toUpperCase() === 'VERSION') {
							projectVersion = elArguments[2]?.value;
						}
					} else if (
						el.identifier.value === 'list' &&
						elArguments[0]?.value === 'APPEND' &&
						elArguments[1]?.value === 'CMAKE_MODULE_PATH'
					) {
						// handle module path
						modelPath.push(getVarValue(elArguments[2]?.value, vars));
					} else if (el.identifier.value === 'find_package') {
						// handle packages
						packages.push(elArguments[0]?.value);
					} else if (el.identifier.value === 'include') {
						// handle include and parse recursively
						const fileName = `${elArguments[0]?.value}.cmake`;
						const foundPath = modelPath.find(i => fs.existsSync(path.join(i, fileName)));
						if (foundPath) {
							const filePath = path.join(foundPath, fileName);
							console.log(`parse: ${filePath}`);
							parse(filePath);
						}
					} else if (el.identifier.value === 'add_subdirectory') {
						const subDir = elArguments[0]?.value;
						parseRoot(path.join(rootPath, subDir), cb);
					}
				}
			})
		);
		return {ast, vars, modelPath, packages, projectName, projectVersion};
	};

	const rPath = path.join(rootPath, mainFile || 'CMakeLists.txt');
	if (fs.existsSync(rPath)) {
		console.log(`parse: ${rPath}`);
		const r = parse(rPath);
		// console.log('vars ==>', r.vars);
		// console.log('projectName ==>', projectName);
		// console.log('projectVersion ==>', projectVersion);
		// console.log('modelPath ==>', r.modelPath);
		// console.log('packages ==>', r.packages);
		cb(r);
	} else {
		console.log(`not found: ${rPath}`);
	}
};

module.exports = {traversAST, Visitor, parseRoot};
