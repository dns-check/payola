// Shared 3D Secure (SCA) authentication support for Payola subscription forms
var PayolaStripeSCA = {
    // Handle 3D Secure authentication for subscriptions requiring SCA
    // Returns true if 3D Secure handling was initiated, false otherwise
    handleIfIncomplete: function(data, onSuccess, onError) {
        if (data.stripe_status === "incomplete" && data.client_secret) {
            PayolaStripeSCA.authenticate(data.client_secret, onSuccess, onError);
            return true;
        }
        return false;
    },

    // Perform 3D Secure authentication with the given client secret
    authenticate: function(clientSecret, onSuccess, onError) {
        var stripe = PayolaStripe.getStripe();

        if (!stripe) {
            onError("Unable to initialize 3D Secure authentication. Please refresh the page and try again.");
            return;
        }

        // Use confirmCardPayment to handle 3D Secure authentication
        stripe.confirmCardPayment(clientSecret).then(function(result) {
            if (result.error) {
                onError(result.error.message);
            } else {
                // Payment succeeded or requires no further action
                onSuccess();
            }
        });
    },

    // Handle poll response with SCA support
    // Returns true if the response was handled (active, errored, or SCA initiated)
    // Returns false if polling should continue
    handlePollResponse: function(data, callbacks) {
        if (data.status === "active") {
            callbacks.onActive();
            return true;
        } else if (data.status === "errored") {
            callbacks.onError(data.error);
            return true;
        } else if (PayolaStripeSCA.handleIfIncomplete(data, callbacks.onScaSuccess, callbacks.onError)) {
            // 3D Secure authentication initiated
            return true;
        }
        return false;
    }
};
