var SmartPay = require('smartpay'),
	should = require('should'),
	TransactionService = require('./../../lib/transaction_service'),
	config = require('./../../config/smart_pay.js').config,
	MongoClient = require('mongodb').MongoClient;
describe("TransactionService", function () {
	describe("buildSmartPayRequest", function () {
		before(function () {
			transaction = {
				slug: 'pay-legalisation-drop-off',
				title: 'Pay to legalise documents using the drop-off service',
				document_cost: 75,
				document_types: undefined,
				postage_cost: false,
				postage_options: undefined,
				registration: undefined,
				registration_cost: undefined,
				account: 'legalisation-drop-off',
				allow_zero_document_count: undefined
			};
			transactionService = new TransactionService(transaction);
			transactionBody = {
				country: '',
				dc: '1',
				email_address: 'test@test.com'
			};
			calculation = transactionService.calculateTotal(transactionBody);
			validatedEmail = 'test@test.com';
			dbCount = '';
			number = '';
			collection = db.collection('transactions');
			date = new Date();
			date.setHours(0, 0, 0, 0);
			collection.count({
				'service': transaction.slug,
				'dateAdded': {
					'$gte': date
				}
			}, function (err, dbCount) {
				db.close();
				dbCount = dbCount + 1;
				transactionService.getNextPaymentNumber(transaction.slug, function (number) {
					number = number + 1;
				});
			});
		});
		it("Calculation should be correct", function () {
			calculation.totalCost.should.equal(75);
		});
		it("db count should be correct", function () {
			dbCount.should.equal(number);
		});
	});
});