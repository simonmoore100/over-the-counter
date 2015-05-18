var app = require('./../../app'),
    request = require('supertest'),
    should = require('should');

describe("GET /healthcheck", function(){
  it("should respond successfully", function(done){
    request(app)
      .get("/healthcheck")
      .expect(200)
      .end(function(err, res){
        should.not.exist(err);
        res.text.should.equal('OK');
        done();
      });
  });
});
