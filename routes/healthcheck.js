/*
 * GET /healthcheck
 */
exports.healthcheck = function (req, res) {
  res.send(200, 'OK');
};
