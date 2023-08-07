const http = require('http');
const fs = require('fs');

const runService = (sbomPath, port = 8081) => {
	const SERVER = http.createServer((request, response) => {
		let url = request.url;
		if (url.includes('?')) {
			url = url.split('?')[0];
		}

		let ext = url.split('.').pop();
		let method = request.method;
		console.log(new Date().toISOString(), method, url);
		if (method === 'GET' && url === '/') {
			response.writeHead(200);
			response.end('service running');
		} else if (method === 'GET' && url.startsWith('/sbom')) {
			response.writeHead(200, {'Content-Type': 'application/json'});
			response.end(fs.readFileSync(sbomPath, 'utf8'));
		} else {
			response.writeHead(404);
			response.end(
				JSON.stringify({
					message: 'not found',
				})
			);
		}
	});

	SERVER.listen(port);

	console.info(`Visit Web Service at http://localhost:${port}/`);
};

module.exports = {runService};
