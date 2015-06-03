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