var PayolaOnestepSubscriptionForm = {
    // Store the Stripe.js v3 instance for 3D Secure authentication
    stripeV3: null,

    initialize: function() {
        $(document).off('submit.payola-onestep-subscription-form').on(
            'submit.payola-onestep-subscription-form', '.payola-onestep-subscription-form',
            function() {
                return PayolaOnestepSubscriptionForm.handleSubmit($(this));
            }
        );

        // Initialize Stripe.js v3 for 3D Secure support
        // The publishable key is set via Stripe.setPublishableKey() in the page
        if (typeof Stripe !== 'undefined' && Stripe.key) {
            PayolaOnestepSubscriptionForm.stripeV3 = Stripe(Stripe.key);
        }
    },

    handleSubmit: function(form) {
        if (!PayolaOnestepSubscriptionForm.validateForm(form)) {
            return false;
        }

        $(form).find(':submit').prop('disabled', true);
        $('.payola-spinner').show();
        Stripe.card.createToken(form, function(status, response) {
            PayolaOnestepSubscriptionForm.stripeResponseHandler(form, status, response);
        });
        return false;
    },

    validateForm: function(form) {
        var cardNumber = $( "input[data-stripe='number']" ).val();
        if (!Stripe.card.validateCardNumber(cardNumber)) {
            PayolaOnestepSubscriptionForm.showError(form, 'The card number is not a valid credit card number.');
            return false;
        }
        if ($("[data-stripe='exp']").length){
            var valid = !Stripe.card.validateExpiry($("[data-stripe='exp']").val());
        }else{
            var expMonth = $("[data-stripe='exp_month']").val();
            var expYear = $("[data-stripe='exp_year']").val();
            var valid = !Stripe.card.validateExpiry(expMonth, expYear);
        }
        if (valid) {
            PayolaOnestepSubscriptionForm.showError(form, "Your card's expiration month/year is invalid.");
            return false;
        }

        var cvc = $( "input[data-stripe='cvc']" ).val();
        if(!Stripe.card.validateCVC(cvc)) {
            PayolaOnestepSubscriptionForm.showError(form, "Your card's security code is invalid.");
            return false;
        }

        return true;
    },

    stripeResponseHandler: function(form, status, response) {
        if (response.error) {
            PayolaOnestepSubscriptionForm.showError(form, response.error.message);
        } else {
            var email = form.find("[data-payola='email']").val();
            var coupon = form.find("[data-payola='coupon']").val();
            var quantity = form.find("[data-payola='quantity']").val();

            var base_path = form.data('payola-base-path');
            var plan_type = form.data('payola-plan-type');
            var plan_id = form.data('payola-plan-id');

            var action = $(form).attr('action');

            form.append($('<input type="hidden" name="plan_type">').val(plan_type));
            form.append($('<input type="hidden" name="plan_id">').val(plan_id));
            form.append($('<input type="hidden" name="stripeToken">').val(response.id));
            form.append($('<input type="hidden" name="stripeEmail">').val(email));
            form.append($('<input type="hidden" name="coupon">').val(coupon));
            form.append($('<input type="hidden" name="quantity">').val(quantity));
            form.append(PayolaOnestepSubscriptionForm.authenticityTokenInput());
            $.ajax({
                type: "POST",
                url: action,
                data: form.serialize(),
                success: function(data) { PayolaOnestepSubscriptionForm.poll(form, 60, data.guid, base_path); },
                error: function(data) { PayolaOnestepSubscriptionForm.showError(form, jQuery.parseJSON(data.responseText).error); }
            });
        }
    },

    poll: function(form, num_retries_left, guid, base_path) {
        if (num_retries_left === 0) {
            PayolaOnestepSubscriptionForm.showError(form, "This seems to be taking too long. Please contact support and give them transaction ID: " + guid);
            return;
        }
        var handler = function(data) {
            if (data.status === "active") {
                window.location = base_path + '/confirm_subscription/' + guid;
            } else if (data.stripe_status === "incomplete" && data.client_secret) {
                // Handle 3D Secure authentication for incomplete subscriptions
                PayolaOnestepSubscriptionForm.handle3DSecure(form, data.client_secret, guid, base_path);
            } else {
                setTimeout(function() { PayolaOnestepSubscriptionForm.poll(form, num_retries_left - 1, guid, base_path); }, 500);
            }
        };
        var errorHandler = function(jqXHR){
            PayolaOnestepSubscriptionForm.showError(form, jQuery.parseJSON(jqXHR.responseText).error);
        };

        if (typeof guid != 'undefined') {
            $.ajax({
                type: 'GET',
                dataType: 'json',
                url: base_path + '/subscription_status/' + guid,
                success: handler,
                error: errorHandler
            });
        }
    },

    // Handle 3D Secure authentication for subscriptions requiring SCA
    handle3DSecure: function(form, clientSecret, guid, base_path) {
        var stripe = PayolaOnestepSubscriptionForm.stripeV3;

        if (!stripe) {
            // Try to initialize Stripe.js v3 if not already done
            if (typeof Stripe !== 'undefined' && Stripe.key) {
                stripe = Stripe(Stripe.key);
                PayolaOnestepSubscriptionForm.stripeV3 = stripe;
            } else {
                PayolaOnestepSubscriptionForm.showError(form, "Unable to initialize 3D Secure authentication. Please refresh the page and try again.");
                return;
            }
        }

        // Use confirmCardPayment to handle 3D Secure authentication
        stripe.confirmCardPayment(clientSecret).then(function(result) {
            if (result.error) {
                // Show error to customer
                PayolaOnestepSubscriptionForm.showError(form, result.error.message);
            } else {
                // Payment succeeded or requires no further action
                // Continue polling to wait for the subscription to become active
                // The webhook will update the subscription status
                setTimeout(function() {
                    PayolaOnestepSubscriptionForm.poll(form, 60, guid, base_path);
                }, 1000);
            }
        });
    },

    showError: function(form, message) {
        $('.payola-spinner').hide();
        $(form).find(':submit')
               .prop('disabled', false)
               .trigger('error', message);

        var error_selector = form.data('payola-error-selector');
        if (error_selector) {
            $(error_selector).text(message);
            $(error_selector).show();
        } else {
            form.find('.payola-payment-error').text(message);
            form.find('.payola-payment-error').show();
        }
    },

    authenticityTokenInput: function() {
        return $('<input type="hidden" name="authenticity_token"></input>').val($('meta[name="csrf-token"]').attr("content"));
    }
};

PayolaOnestepSubscriptionForm.initialize();
