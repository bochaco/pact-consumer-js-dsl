define('interaction', [], function() {

    function Interaction() {
        this.provider_state = "";
        this.description = "";
        this.request = {};
        this.response = {};
        for (var prop in this) {
            Interaction.prototype[prop] = this[prop];
        }
    }

    Interaction.prototype.given = function(providerState) {
        this.provider_state = providerState;
        return this;
    };

    Interaction.prototype.uponReceiving = function(description) {
        this.description = description;
        return this;
    };

    Interaction.prototype.withRequest = function(firstParameter, path, headers, body) {
        if (typeof(firstParameter) == "object") {
            this.request.method = firstParameter.method;
            this.request.path = firstParameter.path;
            this.request.headers = firstParameter.headers;
            this.request.body = firstParameter.body;
        }
        else {
            this.request.method = firstParameter;
            this.request.path = path;
            this.request.headers = headers;
            this.request.body = body;
        }
        if (!this.request.method || !this.request.path) {
            throw "pact-js-dsl's 'withRequest' function requires 'method' and 'path' parameters";
        }

        return this;
    };

    Interaction.prototype.willRespondWith = function(firstParameter, headers, body) {
        if (typeof(firstParameter) == "object") {
            this.response.status = firstParameter.status;
            this.response.headers = firstParameter.headers;
            this.response.body = firstParameter.body;
        }
        else {
            this.response.status = firstParameter;
            this.response.headers = headers;
            this.response.body = body;
        }
        if (!this.response.status) {
            throw "pact-js-dsl's 'willRespondWith' function requires 'status' parameter";
        }

        return this;
    };

    return Interaction;
});

define('mockService', ['pact', 'interaction'],
    function(Pact, Interaction) {
        var _host = "http://127.0.0.1";
        var _port = "";

        function MockService(consumerName, providerName, port, pactDir) {
            _port = port;
            this.pact = new Pact();
            this.pact.consumer.name = consumerName;
            this.pact.provider.name = providerName;
            if (pactDir) {
                this.pact.pact_dir = pactDir;
            }
            for (var prop in this) {
                MockService.prototype[prop] = this[prop];
            }
        }
        MockService.prototype.given = function(providerState){
            var interaction = new Interaction();
            interaction.given(providerState);
            this.pact.interactions.push(interaction);
            return interaction; 
        }

        MockService.prototype.uponReceiving = function(description){
            var interaction = new Interaction();
            interaction.uponReceiving(description);
            this.pact.interactions.push(interaction);
            return interaction;
        }

        MockService.prototype.clean = function() {
            var xhr = new XMLHttpRequest();
            xhr.open("DELETE", _host + ":" + _port + "/interactions", false);
            xhr.setRequestHeader("X-Pact-Mock-Service", true);
            xhr.send();
            if(200 != xhr.status){
                throw "pact-js-dsl: Pact cleanup failed. "+ xhr.responseText;
            }
        };

        MockService.prototype.setup = function() {
            var xhr;
            for (var i = 0; i < this.pact.interactions.length; i++) {
                xhr = new XMLHttpRequest();
                xhr.open("POST", _host + ":" + _port + "/interactions", false);
                xhr.setRequestHeader("X-Pact-Mock-Service", true);
                xhr.setRequestHeader("Content-type", "application/json");
                xhr.send(JSON.stringify(this.pact.interactions[i]));
                if(200 != xhr.status){
                    throw "pact-js-dsl: Pact interaction setup failed. "+ xhr.responseText;
                }
            }
        };

        MockService.prototype.verify = function() {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", _host + ":" + _port + "/interactions/verification", false);
            xhr.setRequestHeader("X-Pact-Mock-Service", true);
            xhr.send();
            if(200 != xhr.status){
                throw "pact-js-dsl: Pact verification failed. "+ xhr.responseText;
            }
        };

        MockService.prototype.write = function() {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", _host + ":" + _port + "/pact", false);
            xhr.setRequestHeader("X-Pact-Mock-Service", true);
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.send(JSON.stringify(this.pact));
            if(200 != xhr.status){
                throw "pact-js-dsl: Could not write the pact file. "+ xhr.responseText;
            }
        };

        MockService.prototype.run = function(testFn) {
            var self = this;
            self.clean();   // Cleanup the server 
            self.setup();   // Post the interactions

            var complete = function() { 
                self.verify();  //Verify with the server
                self.pact.interactions = []; //Clean the local setup
            };

            testFn(complete);       // Call the tests
        };

        return MockService;
    });

define('pact', [], function () {
	function Pact() {
		this.provider = {};
		this.consumer = {};
		this.interactions = [];
		this.pact_dir=".";
		this.metadata = {
			"pact_gem" : {
			"version" : "1.0.9"
			}
		};
	}
	return Pact;
});