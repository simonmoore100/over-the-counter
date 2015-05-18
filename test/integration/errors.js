var app = require('./../../app'),
    request = require('supertest'),
    should = require('should');

describe("A non existant route", function () {
  it("should respond with the 404 page", function(done){
    request(app)
      .get("/no-internet-here")
      .set('host','pay-register-death-abroad.service.gov.uk')
      .expect(404)
      .end(function(err, res){
        should.not.exist(err);
        res.text.should.match(/Page not found 404/);
        done();
      });
  });
});

describe("An internal server error", function () {
  it("should respond with the 500 page", function(done){
    request(app)
      .post('/confirm')
      .set('host','pay-register-birth-abroad.service.gov.uk')
      .expect(500)
      .end(function(err, res){
        should.not.exist(err);
        res.text.should.match(/Sorry, we are experiencing technical difficulties/);
        done();
      });
  });
});
