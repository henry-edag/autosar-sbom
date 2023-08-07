const libs = require('./libs');
const ld = require('./ldconfig');
const apt = require('./apt');
module.exports = {
  ...libs,
  ...ld,
  ...apt,
}
