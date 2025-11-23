var PayolaSubscriptionForm = {
    cardElements: {},

    initialize: function() {
        PayolaStripe.mountCardElements('.payola-subscription-form', PayolaSubscriptionForm.cardElements);

        $(document).off('submit.payola-subscription-form').on(
            'submit.payola-subscription-form', '.payola-subscription-form',
            function() {
                return PayolaSubscriptionForm.handleSubmit($(this));
            }
        );
    },

    handleSubmit: function(form) {
        var cardElement = PayolaSubscriptionForm.cardElements[form.attr('id') || 'default'];
        if (!cardElement) {
            PayolaSubscriptionForm.showError(form, "Card input not found. Please refresh the page.");
            return false;
        }

        $(form).find(':submit').prop('disabled', true);
        $('.payola-spinner').show();

        PayolaStripe.createToken(cardElement,
            function(token) { PayolaSubscriptionForm.onTokenSuccess(form, token); },
            function(error) { PayolaSubscriptionForm.showError(form, error); }
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

        var data_form = $('<form></form>');
        data_form.append($('<input type="hidden" name="stripeToken">').val(token.id));
        data_form.append($('<input type="hidden" name="stripeEmail">').val(email));
        data_form.append($('<input type="hidden" name="coupon">').val(coupon));
        data_form.append($('<input type="hidden" name="quantity">').val(quantity));
        data_form.append(PayolaStripe.authenticityTokenInput());
        $.ajax({
            type: "POST",
            url: base_path + "/subscribe/" + plan_type + "/" + plan_id,
            data: data_form.serialize(),
            success: function(data) { PayolaSubscriptionForm.poll(form, 60, data.guid, base_path); },
            error: function(data) { PayolaSubscriptionForm.showError(form, jQuery.parseJSON(data.responseText).error); }
        });
    },

    poll: function(form, num_retries_left, guid, base_path) {
        if (num_retries_left === 0) {
            PayolaSubscriptionForm.showError(form, "This seems to be taking too long. Please contact support and give them transaction ID: " + guid);
            return;
        }
        var handler = function(data) {
            if (!PayolaStripeSCA.handlePollResponse(data, {
                onActive: function() {
                    form.append($('<input type="hidden" name="payola_subscription_guid"></input>').val(guid));
                    form.append(PayolaStripe.authenticityTokenInput());
                    form.get(0).submit();
                },
                onError: function(error) {
                    PayolaSubscriptionForm.showError(form, error);
                },
                onScaSuccess: function() {
                    setTimeout(function() { PayolaSubscriptionForm.poll(form, 60, guid, base_path); }, 1000);
                }
            })) {
                setTimeout(function() { PayolaSubscriptionForm.poll(form, num_retries_left - 1, guid, base_path); }, 500);
            }
        };
        var errorHandler = function(jqXHR){
          var responseJSON = jQuery.parseJSON(jqXHR.responseText);
          if(responseJSON.status === "errored"){
            PayolaSubscriptionForm.showError(form, responseJSON.error);
          }
        };

        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: base_path + '/subscription_status/' + guid,
            success: handler,
            error: errorHandler
        });
    },

    showError: function(form, message) {
        PayolaStripe.showError(form, message, { showErrorElement: true });
    }
};

PayolaSubscriptionForm.initialize();
