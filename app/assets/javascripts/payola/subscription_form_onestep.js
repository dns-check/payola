var PayolaOnestepSubscriptionForm = PayolaStripe.createFormHandler({
    formSelector: '.payola-onestep-subscription-form',
    eventNamespace: 'payola-onestep-subscription-form',
    statusEndpoint: 'subscription_status',
    showErrorElement: true,

    onTokenSuccess: function(form, token, handler) {
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
        form.append(PayolaStripe.authenticityTokenInput());
        $.ajax({
            type: "POST",
            url: action,
            data: form.serialize(),
            success: function(data) { handler.poll(form, 60, data.guid, base_path); },
            error: function(data) { handler.showError(form, jQuery.parseJSON(data.responseText).error); }
        });
    },

    onPollSuccess: function(form, data, guid, basePath, numRetriesLeft, handler) {
        if (!PayolaStripeSCA.handlePollResponse(data, {
            onActive: function() {
                window.location = basePath + '/confirm_subscription/' + guid;
            },
            onError: function(error) {
                handler.showError(form, error);
            },
            onScaSuccess: function() {
                setTimeout(function() { handler.poll(form, 60, guid, basePath); }, 1000);
            }
        })) {
            setTimeout(function() { handler.poll(form, numRetriesLeft - 1, guid, basePath); }, 500);
        }
    }
});

PayolaOnestepSubscriptionForm.initialize();
