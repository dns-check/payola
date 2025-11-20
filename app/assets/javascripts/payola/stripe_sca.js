// Shared 3D Secure (SCA) authentication support for Payola subscription forms
var PayolaStripeScA = {
    // Store the Stripe.js v3 instance for 3D Secure authentication
    stripeV3: null,

    // Initialize Stripe.js v3 for 3D Secure support
    initialize: function() {
        if (typeof Stripe !== 'undefined' && Stripe.key) {
            PayolaStripeScA.stripeV3 = Stripe(Stripe.key);
        }
    },

    // Handle 3D Secure authentication for subscriptions requiring SCA
    // Returns true if 3D Secure handling was initiated, false otherwise
    handleIfIncomplete: function(data, onSuccess, onError) {
        if (data.stripe_status === "incomplete" && data.client_secret) {
            PayolaStripeScA.authenticate(data.client_secret, onSuccess, onError);
            return true;
        }
        return false;
    },

    // Perform 3D Secure authentication with the given client secret
    authenticate: function(clientSecret, onSuccess, onError) {
        var stripe = PayolaStripeScA.stripeV3;

        if (!stripe) {
            // Try to initialize Stripe.js v3 if not already done
            if (typeof Stripe !== 'undefined' && Stripe.key) {
                stripe = Stripe(Stripe.key);
                PayolaStripeScA.stripeV3 = stripe;
            } else {
                onError("Unable to initialize 3D Secure authentication. Please refresh the page and try again.");
                return;
            }
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
    }
};

// Initialize on load
PayolaStripeScA.initialize();
