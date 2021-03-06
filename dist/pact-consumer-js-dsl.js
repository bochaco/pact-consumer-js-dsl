(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Pact = factory();
  }
}(this, function() {
var Pact = Pact || {};

(function() {

  // consumerName, providerName, port, pactDir
  this.mockService = function(opts) {
    return Pact.MockService.create(opts);
  };

  this.givenInteraction = function(providerState) {
    return Pact.Interaction.create().given(providerState);
  };

  this.receivingInteraction = function(description) {
    return Pact.Interaction.create().uponReceiving(description);
  };

}).apply(Pact);

Pact.Interaction = Pact.Interaction || {};

(function() {

  this.create = function() {
    return {
      description: '',
      request: {},
      response: {},

      given: function(providerState) {
        this.provider_state = providerState;
        return this;
      },

      uponReceiving: function(description) {
        this.description = description;
        return this;
      },

      withRequest: function(firstParameter, path, headers, body, matchingRules) {

        if (typeof(firstParameter) === 'object') {
          this.request.method = firstParameter.method.toLowerCase();
          this.request.path = firstParameter.path;
          this.request.query = firstParameter.query;
          this.request.headers = firstParameter.headers;
          this.request.body = firstParameter.body;
          this.request.requestMatchingRules = firstParameter.matchingRules;
        } else {
          this.request.method = firstParameter.toLowerCase();
          this.request.path = path;
          this.request.headers = headers;
          this.request.body = body;
          this.request.requestMatchingRules = matchingRules;
        }

        if (!this.request.method || !this.request.path) {
          throw 'pact-consumer-js-dsl\'s "withRequest" function requires "method" and "path" parameters';
        }

        return this;
      },

      willRespondWith: function(firstParameter, headers, body, matchingRules) {

        if (typeof(firstParameter) === 'object') {
          this.response.status = firstParameter.status;
          this.response.headers = firstParameter.headers;
          this.response.body = firstParameter.body;
          this.response.responseMatchingRules = firstParameter.matchingRules;
        } else {
          this.response.status = firstParameter;
          this.response.headers = headers;
          this.response.body = body;
          this.response.responseMatchingRules = matchingRules;
        }

        if (!this.response.status) {
          throw 'pact-consumer-js-dsl\'s "willRespondWith" function requires "status" parameter';
        }

        return this;
      }
    };
  };

}).apply(Pact.Interaction);

Pact.Http = Pact.Http || {};

(function() {
	var XMLHttpRequest = typeof exports === 'object'? require('xhr2') : window.XMLHttpRequest;

    this.makeRequest = function(method, url, pactDetails, body, callback) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function(event) {
          callback(null, event.target);
      };
      xhr.onerror = function() {
          callback(new Error('Error calling ' + url));
      };
      xhr.open(method, url, true);
      xhr.setRequestHeader('X-Pact-Mock-Service', 'true');
      if (pactDetails && pactDetails.consumer) {
         xhr.setRequestHeader('X-Pact-Consumer', pactDetails.consumer.name);
      }
      if (pactDetails && pactDetails.provider) {
         xhr.setRequestHeader('X-Pact-Provider', pactDetails.provider.name);
      }
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(body);
  };

}).apply(Pact.Http);

Pact.MockServiceRequests = Pact.MockServiceRequests || {};

(function() {

  var createResponseHandler = function (message, callback) {
    return function(error, response) {
      if (error) {
        callback(error);
      } else if (200 !== response.status) {
        var errorMessage = '\npact-consumer-js-dsl: ' + message + '\n' + response.responseText + '\n';
        callback(new Error(errorMessage));
      } else {
        callback(null);
      }
    };
  };

  this.getVerification = function(pactDetails, baseUrl, callback) {
    Pact.Http.makeRequest('GET', baseUrl + '/interactions/verification', pactDetails, null, createResponseHandler('Pact verification failed', callback));
  };

  this.putInteractions = function(pactDetails, interactions, baseUrl, callback) {
    Pact.Http.makeRequest('PUT', baseUrl + '/interactions', pactDetails, JSON.stringify({interactions: interactions}), createResponseHandler('Pact interaction setup failed', callback));
  };

  this.deleteInteractions = function(pactDetails, baseUrl, callback) {
    Pact.Http.makeRequest('DELETE', baseUrl + '/interactions', pactDetails, null, createResponseHandler('Pact interaction cleanup failed', callback));
  };

  this.postInteraction = function(pactDetails, interaction, baseUrl, callback) {
    Pact.Http.makeRequest('POST', baseUrl + '/interactions', pactDetails, JSON.stringify(interaction), createResponseHandler('Pact interaction setup failed', callback));
  };

  this.postPact = function(pactDetails, baseUrl, callback) {
    Pact.Http.makeRequest('POST', baseUrl + '/pact', pactDetails, JSON.stringify(pactDetails), createResponseHandler('Could not write the pact file', callback));
  };

}).apply(Pact.MockServiceRequests);
Pact.MockService = Pact.MockService || {};

(function() {

  function MockService(opts) {

    if (!opts || typeof opts.port === 'undefined' ) {
      throw new Error('Error creating MockService. Please provide the Pact mock service port');
    }

    var _host = opts.host || '127.0.0.1';
    var _baseURL = 'http://' + _host + ':' + opts.port;
    var _interactions = [];
    var self = this;

    if (typeof opts.done !== 'function') {
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

Pact.Match = Pact.Match || {};

(function() {
    this.term = function(term) {
        if (!term ||
            typeof term.generate === 'undefined' ||
            typeof term.matcher === 'undefined') {
            throw new Error('Error creating a Pact Term. Please provide an object containing \'generate\' and \'matcher\' properties');
        }

        return {
            'json_class': 'Pact::Term',
            'data': {
                'generate': term.generate,
                'matcher': {
                    'json_class': 'Regexp',
                    'o': 0,
                    's': term.matcher
                }
            }
        };
    };

    this.eachLike = function(content, options) {
        if(typeof content === 'undefined') {
            throw new Error('Error creating a Pact eachLike. Please provide a content argument');
        }

        if(options && !options.min) {
            throw new Error('Error creating a Pact eachLike. Please provide options.min that is > 1');
        }
        
        return {
            'json_class': 'Pact::ArrayLike',
            'contents': content,
            'min': (!options) ? 1 : options.min
        };
    } ;

    this.somethingLike = function(value) {
        if (typeof value === 'undefined' ||
            typeof value === 'function') {
            throw new Error('Error creating a Pact somethingLike Match. Value cannot be a function or undefined');
        }

        return {
            'json_class': 'Pact::SomethingLike',
            'contents' : value
        };
    };

}).apply(Pact.Match);
return Pact;
}));
