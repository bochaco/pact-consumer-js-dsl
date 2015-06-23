Pact.MockService = Pact.MockService || {};

(function() {

  function MockService(opts) {
    var _baseURL = 'http://127.0.0.1:' + opts.port;
    var _interactions = [];
    var self = this;

    if (typeof(opts.done) !== 'function') {
      throw new Error('Error creating MockService. Please provide an option called "done", that is a function that asserts (using your test framework of choice) that the first argument, error, is null.');
    }

    var _doneCallback = opts.done;

    var _pactDetails = {
      consumer: {
        name: opts.consumer
      },
      provider: {
        name: opts.provider
      }
    };

    var setupInteractionsSequentially = function(_pactDetails, interactions, index, callback) {
      if (index >= interactions.length) {
        callback(null);
        return;
      }

      Pact.MockServiceRequests.postInteraction(_pactDetails, interactions[index], _baseURL, function(error) {
        if (error) {
          callback(error);
          return;
        }

        setupInteractionsSequentially(_pactDetails, interactions, index + 1, callback);
      });
    };

    this.cleanAndSetup = function(callback, usePost) {
      this.clean(function(error){
        if (error) {
          callback(error);
          return;
        }
        self.setup(callback, usePost);
      });
    };

    //private
    this.clean = function(callback) {
      // Cleanup the interactions from the previous test
      Pact.MockServiceRequests.deleteInteractions(_pactDetails, _baseURL, callback);
    };

    //private
    this.setup = function(callback, usePost) {
      // PUT the new interactions
      var interactions = _interactions;
      _interactions = []; //Clean the local setup
      if (usePost) {
        setupInteractionsSequentially(_pactDetails, interactions, 0, callback);
      } else {
        Pact.MockServiceRequests.putInteractions(_pactDetails, interactions, _baseURL, callback);
      }
    };

    this.verifyAndWrite = function(callback) {
      callback = callback || function(){};
      //Verify that the expected interactions have occurred
      this.verify(function(verifyError) {
        if (verifyError) {
          callback(verifyError);
          return;
        }

        self.write(callback);
      });
    };

    this.verify = function(callback) {
        callback = callback || function(){};
        //Verify that the expected interactions have occurred
        Pact.MockServiceRequests.getVerification(_pactDetails, _baseURL, callback);
    };

    this.write = function(callback) {
        callback = callback || function(){};
        Pact.MockServiceRequests.postPact(_pactDetails, _baseURL, callback);
    };

    this.given = function(providerState) {
      var interaction = Pact.givenInteraction(providerState);
      _interactions.push(interaction);
      return interaction;
    };

    this.uponReceiving = function(description) {
      var interaction = Pact.receivingInteraction(description);
      _interactions.push(interaction);
      return interaction;
    };

    this.run = function(completeFunction, testFunction, useCleanAndSetup, usePost) {
      var setupFn;
      if (useCleanAndSetup) {
        setupFn = this.cleanAndSetup.bind(this);
      } else {
        setupFn = this.setup.bind(this);
      }

      if (typeof(completeFunction) !== 'function' || typeof(testFunction) !== 'function') {
        throw new Error('Error calling run function. \'completeFunction\' and \'testFunction\' are mandatory.');
      }

      var done = function (error) {
        _doneCallback(error);
        completeFunction();
      };

      var that = this;
      setupFn(function(error) {
        if (error) {
          done(error);
          return;
        }

        // Call the tests
        testFunction(function() {
          that.verifyAndWrite(done);
        });
      }, usePost);
    };
  }

  this.create = function(opts) {
    return new MockService(opts);
  };

}).apply(Pact.MockService);
