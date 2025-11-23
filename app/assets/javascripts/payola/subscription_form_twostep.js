var PayolaSubscriptionForm = PayolaStripe.createFormHandler({
    formSelector: '.payola-subscription-form',
    eventNamespace: 'payola-subscription-form',
    statusEndpoint: 'subscription_status',
    showErrorElement: true,

    onTokenSuccess: function(form, token, handler) {
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
            success: function(data) { handler.poll(form, 60, data.guid, base_path); },
            error: function(data) { handler.showError(form, jQuery.parseJSON(data.responseText).error); }
        });
    },

    onPollSuccess: function(form, data, guid, basePath, numRetriesLeft, handler) {
        if (!PayolaStripeSCA.handlePollResponse(data, {
            onActive: function() {
                form.append($('<input type="hidden" name="payola_subscription_guid"></input>').val(guid));
                form.append(PayolaStripe.authenticityTokenInput());
                form.get(0).submit();
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

PayolaSubscriptionForm.initialize();
