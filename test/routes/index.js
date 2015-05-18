var should = require('should'),
    routes = require('../../routes/index');

describe("azureSecureMiddleware", function () {
  it("should inject the expected ssl header", function() {
    var req = { headers : { 'x-arr-ssl' : 'true' } };
    routes.azureSecureMiddleware(req, {}, function () {
      req.headers['x-forwarded-proto'].should.equal('https');
    });
  });
});
