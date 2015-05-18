/*jshint unused:false */
module.exports = {
  error404 : function (req, res, next) {
    var msg = 'Page not found 404';

    res.status(404);
    res.locals.journeyDescription = 'page_not_found_404';
    res.locals.pageTitle = msg;

    if (req.accepts('html')) {
      res.render('404');
    } else {
      res.send(msg);
    }
  },

  error500 : function (error, req, res, next) {
    var msg = 'Sorry, we are experiencing technical difficulties (500 error)';
    res.status(500);
    res.locals.journeyDescription = 'internal_server_error_500';
    res.locals.pageTitle = msg;

    if (req.accepts('html')) {
      res.render('500');
    } else {
      res.send(msg);
    }
  }
};
