# FCO-Services

## A port of FCO-Services to Express/NodeJS

This app contains transaction start and done pages for the FCO payment transactions. These wrap around the existing Barclaycard EPDQ service.

## Routing

This application uses subdomain based routing to route to the individual transactions.  The start page for the transactions can be found at `<slug>.*/start` (e.g. with development config below they're at `<slug>.dev.gov.uk/start`).  The available slugs can be found in `lib/transactions.json`.

## Development configuration

> Note: this section assumes you are running the app on your local machine and not your development VM.

  1. Edit ```/etc/hosts``` and add the following entries:

```
127.0.0.1   pay-legalisation-drop-off.dev.gov.uk
127.0.0.1   pay-legalisation-post.dev.gov.uk
127.0.0.1   pay-register-birth-abroad.dev.gov.uk
127.0.0.1   pay-register-death-abroad.dev.gov.uk
127.0.0.1   pay-foreign-marriage-certificates.dev.gov.uk
```

  2. Export/Start the app with the appropriate environment variables to configure ePDQ transactions. These are:

      ```epdq_birth_pspid``` - the pre-shared merchant key for ePDQ (birth-death-marriage) transactions.

      ```epdq_birth_shaIn``` - the inbound sha for ePDQ requests.

      ```epdq_birth_shaOut``` - the outbound sha from ePDQ responses.

      There are corresponding configuration variables for [legalisation drop off](https://github.com/alphagov/fco-services-node/blob/master/config/epdq.js#L15) and [legalisation by post](https://github.com/alphagov/fco-services-node/blob/master/config/epdq.js#L9) services, see [the alphagov-deployment config](https://github.gds/gds/alphagov-deployment/blob/master/fco-services/initializers_by_organisation/preview/epdq.rb) for values.

      ```$ epdq_legalisation_post_pspid=foo epdq_legalisation_post_shaIn=bar epdq_legalisation_post_shaOut=baz node app.js```

      [http://pay-register-birth-abroad.dev.gov.uk:1337/start](http://pay-register-birth-abroad.dev.gov.uk:1337/start)

## Tests

```$ npm test```

## Running the app

First run the build script:

```$ ./build```

This will update npm dependencies, integrate [govuk_template](https://github.com/alphagov/govuk_template) views into the main app, and build application styling.

You can then run the app with:

```$ npm start```


## Making changes

After updating `npm` dependencies, or changing SCSS files, you will need to run `./build` and then commit the changes into git.

To test manually test/view the `done` pages, which depend on some complex parameters returned by the payment provider, you can use the [example paramaters from the integration test](test/integration/epdq.js#L271-L286), for example:
```
http://pay-register-birth-abroad.dev.gov.uk:1337/done?OrderID=test&currency=GBP&amount=45&PM=CreditCard&ACCEPTANCE=test123&STATUS=5&CARDNO=XXXXXXXXXXXX1111&CN=MR%20MICKEY%20MOUSE&TRXDATE=03%2F11%2F13&PAYID=12345678&NCERROR=0&BRAND=VISA&SHASIGN=6ACE8B0C8E0B427137F6D7FF86272AA570255003&document_count=3&registration_count=4&postage=yes
```
