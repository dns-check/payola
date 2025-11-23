var PayolaPaymentForm = PayolaStripe.createFormHandler({
    formSelector: '.payola-payment-form',
    eventNamespace: 'payola-payment-form',
    statusEndpoint: 'status',
    showErrorElement: false,

    onTokenSuccess: function(form, token, handler) {
        var email = form.find("[data-payola='email']").val();

        var base_path = form.data('payola-base-path');
        var product = form.data('payola-product');
        var permalink = form.data('payola-permalink');
        var currency = form.data('payola-currency');
        var stripe_customer_id = form.data('stripe_customer_id');

        var data_form = $('<form></form>');
        data_form.append($('<input type="hidden" name="stripe_customer_id">').val(stripe_customer_id));
        data_form.append($('<input type="hidden" name="currency">').val(currency));
        data_form.append($('<input type="hidden" name="stripeToken">').val(token.id));
        data_form.append($('<input type="hidden" name="stripeEmail">').val(email));
        data_form.append(PayolaStripe.authenticityTokenInput());

        $.ajax({
            type: "POST",
            url: base_path + "/buy/" + product + "/" + permalink,
            data: data_form.serialize(),
            success: function(data) { handler.poll(form, 60, data.guid, base_path); },
            error: function(data) { handler.showError(form, jQuery.parseJSON(data.responseText).error); }
        });
    },

    onPollSuccess: function(form, data, guid, basePath, numRetriesLeft, handler) {
        if (data.status === "finished") {
            form.append($('<input type="hidden" name="payola_sale_guid"></input>').val(guid));
            form.append(PayolaStripe.authenticityTokenInput());
            form.get(0).submit();
        } else if (data.status === "errored") {
            handler.showError(form, data.error);
        } else {
            setTimeout(function() { handler.poll(form, numRetriesLeft - 1, guid, basePath); }, 500);
        }
    }
});

PayolaPaymentForm.initialize();
