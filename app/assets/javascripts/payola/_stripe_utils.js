// Shared Stripe.js v3 utilities for Payola
var PayolaStripe = {
    // Get the global Stripe instance
    getStripe: function() {
        if (typeof payolaStripe !== 'undefined') {
            return payolaStripe;
        }
        return null;
    },

    // Extract expiration month and year from form
    // Handles both combined [data-stripe='exp'] and separate exp_month/exp_year fields
    extractExpiry: function(form) {
        if (form.find("[data-stripe='exp']").length) {
            var exp = form.find("[data-stripe='exp']").val();
            var parts = exp.split(/[\s\/]+/);
            return { month: parts[0], year: parts[1] };
        }
        return {
            month: form.find("[data-stripe='exp_month']").val(),
            year: form.find("[data-stripe='exp_year']").val()
        };
    },

    // Extract card data from a form with data-stripe attributes
    extractCardData: function(form) {
        var expiry = PayolaStripe.extractExpiry(form);
        return {
            number: form.find("[data-stripe='number']").val().replace(/\s/g, ''),
            cvc: form.find("[data-stripe='cvc']").val(),
            exp_month: expiry.month,
            exp_year: expiry.year
        };
    },

    // Create a Stripe token from form card data
    // Calls onSuccess(token) or onError(message)
    createToken: function(form, onSuccess, onError) {
        var stripe = PayolaStripe.getStripe();
        if (!stripe) {
            onError("Stripe.js not initialized. Please refresh the page.");
            return;
        }

        stripe.createToken('card', PayolaStripe.extractCardData(form))
            .then(function(result) {
                if (result.error) {
                    onError(result.error.message);
                } else {
                    onSuccess(result.token);
                }
            });
    },

    // Validate card number using Luhn algorithm
    validateCardNumber: function(number) {
        if (!number) return false;
        number = number.replace(/\s/g, '');
        if (!/^\d{13,19}$/.test(number)) return false;

        var sum = 0;
        var isEven = false;
        for (var i = number.length - 1; i >= 0; i--) {
            var digit = parseInt(number[i], 10);
            if (isEven) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            isEven = !isEven;
        }
        return sum % 10 === 0;
    },

    // Validate expiration date
    validateExpiry: function(month, year) {
        if (!month || !year) return false;
        month = parseInt(month, 10);
        year = parseInt(year, 10);
        if (month < 1 || month > 12) return false;
        // Handle 2-digit years
        if (year < 100) year += 2000;
        var now = new Date();
        var expiry = new Date(year, month);
        return expiry > now;
    },

    // Validate CVC
    validateCVC: function(cvc) {
        if (!cvc) return false;
        return /^\d{3,4}$/.test(cvc);
    },

    // Validate all card fields in a form
    validateCard: function(form) {
        var cardNumber = form.find("input[data-stripe='number']").val();
        if (!PayolaStripe.validateCardNumber(cardNumber)) {
            return { valid: false, error: 'The card number is not a valid credit card number.' };
        }

        var expiry = PayolaStripe.extractExpiry(form);
        if (!PayolaStripe.validateExpiry(expiry.month, expiry.year)) {
            return { valid: false, error: "Your card's expiration month/year is invalid." };
        }

        var cvc = form.find("input[data-stripe='cvc']").val();
        if (!PayolaStripe.validateCVC(cvc)) {
            return { valid: false, error: "Your card's security code is invalid." };
        }

        return { valid: true };
    }
};
