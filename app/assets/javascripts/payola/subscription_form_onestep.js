var PayolaOnestepSubscriptionForm = {
    initialize: function() {
        $(document).off('submit.payola-onestep-subscription-form').on(
            'submit.payola-onestep-subscription-form', '.payola-onestep-subscription-form',
            function() {
                return PayolaOnestepSubscriptionForm.handleSubmit($(this));
            }
        );
    },

    handleSubmit: function(form) {
        var validation = PayolaStripe.validateCard(form);
        if (!validation.valid) {
            PayolaOnestepSubscriptionForm.showError(form, validation.error);
            return false;
        }

        $(form).find(':submit').prop('disabled', true);
        $('.payola-spinner').show();

        PayolaStripe.createToken(form,
            function(token) { PayolaOnestepSubscriptionForm.onTokenSuccess(form, token); },
            function(error) { PayolaOnestepSubscriptionForm.showError(form, error); }
        );

        return false;
    },

    onTokenSuccess: function(form, token) {
        var email = form.find("[data-payola='email']").val();
        var coupon = form.find("[data-payola='coupon']").val();
        var quantity = form.find("[data-payola='quantity']").val();

        var base_path = form.data('payola-base-path');
        var plan_type = form.data('payola-plan-type');
        var plan_id = form.data('payola-plan-id');

        var action = $(form).attr('action');

        form.append($('<input type="hidden" name="plan_type">').val(plan_type));
        form.append($('<input type="hidden" name="plan_id">').val(plan_id));
        form.append($('<input type="hidden" name="stripeToken">').val(token.id));
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
    },

    poll: function(form, num_retries_left, guid, base_path) {
        if (num_retries_left === 0) {
            PayolaOnestepSubscriptionForm.showError(form, "This seems to be taking too long. Please contact support and give them transaction ID: " + guid);
            return;
        }
        var handler = function(data) {
            if (!PayolaStripeSCA.handlePollResponse(data, {
                onActive: function() {
                    window.location = base_path + '/confirm_subscription/' + guid;
                },
                onError: function(error) {
                    PayolaOnestepSubscriptionForm.showError(form, error);
                },
                onScaSuccess: function() {
                    setTimeout(function() { PayolaOnestepSubscriptionForm.poll(form, 60, guid, base_path); }, 1000);
                }
            })) {
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
