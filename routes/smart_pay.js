var SmartPay = require('smartpay'),
	auth = require('basic-auth'),
	TransactionService = require('./../lib/transaction_service');
var journeyDescription = function (res, step) {
	return res.locals.transaction.slug + ':' + step;
};
var config = require('./../config/smart_pay.js').config;
/**
 * Cache control middleware filter.
 */
var setExpiry = function (req, res, next) {
	res.setHeader('Cache-Control', 'max-age=1800, public');
	next();
};
/**
 * changed to smart_pay transaction actions
 *
 */
module.exports = {
	middleware: {
		setExpiry: setExpiry,
		findTransaction: TransactionService.findTransaction
	},
	middlewares: [setExpiry, TransactionService.findTransaction],
	rootRedirect: function (req, res) {
		res.redirect(req.url + 'start');
	},
	/**
	 * GET /start
	 */
	start: function (req, res) {
		res.render('start', {
			country: (req.query['country'] || ''),
			postalCountry: (req.query['postal_country'] || ''),
			transaction: res.locals.transaction,
			journeyDescription: journeyDescription(res, 'start')
		});
	},
	/**
	 * POST /confirm
	 */
	/**
 * @param req
 
 */
	confirm: function (req, res) {
		try {
			var transactionService = new TransactionService(res.locals.transaction);
			var calculation = transactionService.calculateTotal(req.body['transaction']);
			var validatedEmail = transactionService.validateEmail(req.body['transaction']);
			var requestParameters = transactionService.buildParameterList(req, calculation.totalCost, validatedEmail, function (merchantReturnData) {
				transactionService.getNextPaymentNumber(res.locals.transaction.slug, function (number) {
					number = number + 1;
					requestParameters.merchantReference = requestParameters.merchantReference + '-' + number;
					requestParameters.merchantReturnData = merchantReturnData;
					console.log(merchantReturnData);
					requestParameters.shopperEmail = validatedEmail;
					var smartPayRequest = transactionService.buildSmartPayRequest(req, requestParameters);
					delete requestParameters['allowed_methods'];
					delete requestParameters['blocked_methods'];
					SmartPay.testMode = config.testMode;
					var encryptedMerchantReturnData = transactionService.encrypt(requestParameters.merchantReturnData);
					var collection = db.collection(config.dbCollection);
					var document = {
						'_id': requestParameters.merchantReference,
						'service': res.locals.transaction.slug,
						'merchantReturnData': encryptedMerchantReturnData,
						'binRange': 1234,
						'authorised': 0,
						'captured': 0,
						'cancelled': 0,
						'refunded': 0,
						'authorisationEmail': 0,
						'captureEmail': 0,
						'cancellationEmail': 0,
						'refundEmail': 0,
						'dateAdded': new Date()
					};
					collection.insert(document, {
						w: 1
					}, function (err) {
						if (err) {
							return console.dir(err);
						}
						console.log('Inserted reference ' + requestParameters.merchantReference + ' into database successfully');
						res.render('confirm', {
							calculation: calculation,
							requestParameters: requestParameters,
							smartPayRequest: smartPayRequest,
							transaction: res.locals.transaction,
							journeyDescription: journeyDescription(res, 'confirm')
						});
					});
				});
			});
		} catch (err) {
			res.render('start', {
				country: req.body['transaction']['country'],
				postalCountry: req.body['transaction']['postal_country'],
				errors: err.message,
				journeyDescription: journeyDescription(res, 'invalid_form')
			});
		}
	},
	receipt: function (req, res) {
		try {
			var responseParameters = req.query;
			var transactionService = new TransactionService(res.locals.transaction);
			var extractedParameters = transactionService.extractParameterList(req, responseParameters, function (merchantReturnDataDecoded) {
				extractedParameters.merchantReturnData = merchantReturnDataDecoded;
				var merchantReturnDataJson = JSON.parse(extractedParameters.merchantReturnData);
				var date = transactionService.getDate();
				console.log('Reached the receipt page for ' + responseParameters.merchantReference);
				res.render('receipt', {
					responseParameters: responseParameters,
					merchantReturnDataJson: merchantReturnDataJson,
					transaction: res.locals.transaction,
					date: date,
					journeyDescription: journeyDescription(res, 'receipt')
				});
			});
		} catch (e) {
			res.render('payment_error', {
				journeyDescription: journeyDescription(res, 'payment_error')
			});
		}
	},
	notification: function (req, res) {
		/*jshint maxcomplexity:16 */
		/*jshint maxstatements:56*/
		try {
			var credentials = auth(req);
			if (!credentials || credentials.name !== config.basicAuthUsername || credentials.pass !== config.basicAuthPassword || res.locals.transaction.slug !== config.notificationSlug) {
				console.log('A failed attempt has been made to access the notification service');
				res.write('[accepted]');
				res.end();
			} else {
				var transactionService = new TransactionService(res.locals.transaction);
				var date = transactionService.getDate();
				var event = req.body.eventCode;
				var success = req.body.success;
				var merchantReference = req.body.merchantReference;
				var reason = req.body.reason;
				var paymentMethod = req.body.paymentMethod;
				var transactionSlug = merchantReference.split('-');
				var lastFourDigits = reason.split(':');
				var collection = db.collection(config.dbCollection);
				var subject = '';
				var slug = '';
				var emailTemplate = '';
				var emailType = '';
				if (transactionSlug[0] === 'PAYFOREIGNMARRIAGECERTIFICATES') {
					slug = 'pay-foreign-marriage-certificates';
				} else if (transactionSlug[0] === 'PAYLEGALISATIONDROPOFF') {
					slug = 'pay-legalisation-drop-off';
				} else if (transactionSlug[0] === 'PAYLEGALISATIONPOST') {
					slug = 'pay-legalisation-post';
				} else if (transactionSlug[0] === 'PAYREGISTERBIRTHABROAD') {
					slug = 'pay-register-birth-abroad';
				} else if (transactionSlug[0] === 'PAYREGISTERDEATHABROAD') {
					slug = 'pay-register-death-abroad';
				} else {
					slug = '';
				}
				console.log('Reached the notification service for ' + merchantReference + ' (' + event + ')');
				if (event === 'AUTHORISATION' && success === 'true' && slug !== '') {
					console.log('AUTHORISATION notification processed for ' + merchantReference);
					emailType = 'authorisation';
					emailTemplate = slug + '-' + emailType;
					collection.update({
						'_id': merchantReference
					}, {
						$set: {
							'authorised': 1,
							'binRange': lastFourDigits[1]
						}
					}, {
						w: 1
					}, function (err) {
						if (err) {
							return console.dir(err);
						}
					});
					collection.findOne({
						'_id': merchantReference
					}, function (err, document) {
						var decryptedMerchantReturnData = transactionService.decrypt(document.merchantReturnData);
						lastFourDigits = document.binRange;
						transactionService.inflateAndDecode(decryptedMerchantReturnData, function (merchantReturnDataDecoded) {
							var dataDecodedJson = JSON.parse(merchantReturnDataDecoded);
							subject = 'Order for ' + slug + ' from the Foreign Office';
							if (dataDecodedJson.e !== 'blank') {
								transactionService.sendEmail(merchantReference, paymentMethod, dataDecodedJson, emailTemplate, date, subject, lastFourDigits, emailType);
							}
						});
					});
				}
				if (event === 'CAPTURE' && success === 'true' && slug !== '') {
					console.log('CAPTURE notification processed for ' + merchantReference);
					emailType = 'capture';
					emailTemplate = slug + '-' + emailType;
					collection.update({
						'_id': merchantReference
					}, {
						$set: {
							'captured': 1
						}
					}, {
						w: 1
					}, function (err) {
						if (err) {
							return console.dir(err);
						}
					});
					collection.findOne({
						'_id': merchantReference
					}, function (err, document) {
						if (err) {
							return console.dir(err);
						}
						var decryptedMerchantReturnData = transactionService.decrypt(document.merchantReturnData);
						lastFourDigits = document.binRange;
						transactionService.inflateAndDecode(decryptedMerchantReturnData, function (merchantReturnDataDecoded) {
							var dataDecodedJson = JSON.parse(merchantReturnDataDecoded);
							subject = 'Receipt for ' + slug + ' from the Foreign Office';
							if (dataDecodedJson.e !== 'blank') {
								transactionService.sendEmail(merchantReference, paymentMethod, dataDecodedJson, emailTemplate, date, subject, lastFourDigits, emailType);
							}
						});
					});
				}
				if (event === 'REFUND' && success === 'true' && slug !== '') {
					console.log('REFUND notification processed for ' + merchantReference);
					emailType = 'refund';
					emailTemplate = slug + '-' + emailType;
					collection.update({
						'_id': merchantReference
					}, {
						$set: {
							'refunded': 1
						}
					}, {
						w: 1
					}, function (err) {
						if (err) {
							return console.dir(err);
						}
					});
					collection.findOne({
						'_id': merchantReference
					}, function (err, document) {
						if (err) {
							return console.dir(err);
						}
						var decryptedMerchantReturnData = transactionService.decrypt(document.merchantReturnData);
						lastFourDigits = document.binRange;
						transactionService.inflateAndDecode(decryptedMerchantReturnData, function (merchantReturnDataDecoded) {
							var dataDecodedJson = JSON.parse(merchantReturnDataDecoded);
							subject = 'Refund for ' + slug + ' from the Foreign Office';
							if (dataDecodedJson.e !== 'blank') {
								transactionService.sendEmail(merchantReference, paymentMethod, dataDecodedJson, emailTemplate, date, subject, lastFourDigits, emailType);
							}
						});
					});
				}
				if (event === 'CANCELLATION' && success === 'true' && slug !== '') {
					console.log('CANCELLATION notification processed for ' + merchantReference);
					emailType = 'cancellation';
					emailTemplate = slug + '-' + emailType;
					collection.update({
						'_id': merchantReference
					}, {
						$set: {
							'cancelled': 1
						}
					}, {
						w: 1
					}, function (err) {
						if (err) {
							return console.dir(err);
						}
					});
					collection.findOne({
						'_id': merchantReference
					}, function (err, document) {
						if (err) {
							return console.dir(err);
						}
						var decryptedMerchantReturnData = transactionService.decrypt(document.merchantReturnData);
						lastFourDigits = document.binRange;
						transactionService.inflateAndDecode(decryptedMerchantReturnData, function (merchantReturnDataDecoded) {
							var dataDecodedJson = JSON.parse(merchantReturnDataDecoded);
							subject = 'Cancellation for ' + slug + ' from the Foreign Office';
							if (dataDecodedJson.e !== 'blank') {
								transactionService.sendEmail(merchantReference, paymentMethod, dataDecodedJson, emailTemplate, date, subject, lastFourDigits, emailType);
							}
						});
					});
				}
				if (success === 'false') {
					console.log('Notification has not succeeded for ' + merchantReference);
				}
				/*Accept payment anyway even if there was an issue*/
				res.write('[accepted]');
				res.end();
			}
		} catch (err) {
			res.write('[accepted]');
			res.end();
			return console.dir(err);
		}
	}
};