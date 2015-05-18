var app = require('./../../app'),
    http = require('http'),
    request = require('supertest'),
    should = require('should');

describe("GET /", function(){
  it("should respond successfully", function(){
    request(app)
      .get("/")
      .set("host", "pay-register-birth-abroad.test.gov.uk")
      .expect(302)
      .end(function(err, res){
        should.not.exist(err);
        res.text.should.equal("Moved Temporarily. Redirecting to /start");
      });
  });
});
describe("running in the preview environment", function() {
  before(function() {
    // Remove the cached app in require
    delete require.cache[require.resolve('./../../app')];
    process.env.NODE_ENV = 'preview';
    process.env.PORT = 1338;
    process.env.BASIC_AUTH_USERNAME = 'foobar';
    process.env.BASIC_AUTH_PASSWORD = 'barfoo';
    app = require('./../../app');
  });
  after(function() {
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.BASIC_AUTH_USERNAME;
    delete process.env.BASIC_AUTH_PASSWORD;
    app = require('./../../app');
  });
  it("should attempt to authenticate when NODE_ENV is 'preview'", function() {
    request(app)
      .get("/")
      .expect(401);
  });
  it("should authenticate using credentials from environment vars and redirect to a secure URL", function() {
    var basicAuthVal = 'Basic' + new Buffer('foobar').toString('base64') +
      ':' + new Buffer('barfoo').toString('base64');
    request(app)
      .get("/")
      .set('authorization', basicAuthVal)
      .expect(301)
      .end(function(err, res){
        should.not.exist(err);
        res.text.should.match(/Moved Permanently/);
        res.headers['location'].should.equal('https://' + res.req._headers.host + res.req.path);
      });

  });
});
