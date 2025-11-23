// Shared Stripe.js v3 utilities for Payola
var PayolaStripe = {
    // Get the global Stripe instance
    getStripe: function() {
        if (typeof payolaStripe !== 'undefined') {
            return payolaStripe;
        }
        return null;
    },

    // Create and mount separate Stripe Card Elements (cardNumber, cardExpiry, cardCvc)
    // Returns the cardNumber element (used for tokenization), or null if Stripe is not initialized
    // If errorElement is provided, attaches change listeners to display validation errors
    createCardElements: function(numberMount, expiryMount, cvcMount, options, errorElement) {
        var stripe = PayolaStripe.getStripe();
        if (!stripe) return null;

        var elements = stripe.elements();
        var numberOptions = $.extend({}, options || {}, { showIcon: true });
        var cardNumber = elements.create('cardNumber', numberOptions);
        var cardExpiry = elements.create('cardExpiry', options || {});
        var cardCvc = elements.create('cardCvc', options || {});

        cardNumber.mount(numberMount);
        cardExpiry.mount(expiryMount);
        cardCvc.mount(cvcMount);

        // Attach error display listener if errorElement provided
        if (errorElement) {
            var errorEl;
            if (typeof errorElement === 'string') {
                errorEl = document.querySelector(errorElement);
            } else {
                errorEl = errorElement;
            }

            if (errorEl) {
                var handleError = function(event) {
                    errorEl.textContent = event.error ? event.error.message : '';
                };

                cardNumber.on('change', handleError);
                cardExpiry.on('change', handleError);
                cardCvc.on('change', handleError);
            }
        }

        return cardNumber;
    },

    // Mount Card Elements on forms matching a selector
    // Uses separate elements: #card-number, #card-expiry, #card-cvc
    // Returns the cardNumber element reference (Stripe uses it to find related elements during tokenization)
    mountCardElements: function(formSelector, cardElementsStore) {
        $(formSelector).each(function() {
            var form = $(this);
            var formId = form.attr('id') || 'default';

            if (cardElementsStore[formId]) return;

            var numberMount = form.find('#card-number')[0];
            var expiryMount = form.find('#card-expiry')[0];
            var cvcMount = form.find('#card-cvc')[0];
            var errorElement = form.find('#card-errors')[0];

            if (numberMount && expiryMount && cvcMount) {
                var options = {
                    style: {
                        base: {
                            '::placeholder': {
                                color: '#999'
                            }
                        }
                    }
                };
                var cardNumber = PayolaStripe.createCardElements(
                    numberMount, expiryMount, cvcMount, options, errorElement
                );
                if (cardNumber) {
                    cardElementsStore[formId] = cardNumber;
                }
            }
        });
    },

    // Create a Stripe token from a Card Element
    // Calls onSuccess(token) or onError(message)
    createToken: function(cardElement, onSuccess, onError) {
        var stripe = PayolaStripe.getStripe();
        if (!stripe) {
            onError("Stripe.js not initialized. Please refresh the page.");
            return;
        }

        stripe.createToken(cardElement).then(function(result) {
            if (result.error) {
                onError(result.error.message);
            } else {
                onSuccess(result.token);
            }
        });
    }
};

// Shared checkout form utilities for inline checkout partials
var PayolaCheckoutForm = {
    // Initialize a checkout form with Stripe Elements and submit handling
    // Options:
    //   formId: ID of the form element
    //   publishableKey: Stripe publishable key
    //   onSubmit: function(token, form) - called with token after successful tokenization
    //   onPollSuccess: function(data, guid, basePath) - called when polling returns success status
    //   pollEndpoint: function(basePath, guid) - returns the poll URL
    //   confirmPath: function(basePath, guid) - returns the confirmation redirect URL
    init: function(options) {
        var stripe = Stripe(options.publishableKey);
        window.payolaStripe = stripe;

        var form = document.getElementById(options.formId);
        var cardElement = PayolaStripe.createCardElements('#card-number', '#card-expiry', '#card-cvc', null, '#card-errors');

        form.addEventListener('submit', function(event) {
            event.preventDefault();
            PayolaCheckoutForm.setLoading(form, true);

            stripe.createToken(cardElement).then(function(result) {
                if (result.error) {
                    PayolaCheckoutForm.showError(form, result.error.message);
                } else {
                    options.onSubmit(result.token, form);
                }
            });
        });

        return {
            form: form,
            stripe: stripe,
            cardElement: cardElement,
            poll: function(guid, retriesLeft) {
                PayolaCheckoutForm.poll(form, guid, retriesLeft, options);
            }
        };
    },

    // Set form loading state
    setLoading: function(form, loading) {
        var submitButton = form.querySelector('button[type="submit"]');
        var buttonText = form.querySelector('.payola-checkout-button-text');
        var spinner = form.querySelector('.payola-checkout-button-spinner');

        submitButton.disabled = loading;
        buttonText.style.display = loading ? 'none' : 'inline';
        spinner.style.display = loading ? 'inline' : 'none';
    },

    // Show error message and reset form state
    showError: function(form, message) {
        PayolaCheckoutForm.setLoading(form, false);

        var errorSelector = form.getAttribute('data-payola-error-selector');
        var errorDiv = document.querySelector(errorSelector);
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    },

    // Poll for transaction/subscription status
    poll: function(form, guid, retriesLeft, options) {
        if (retriesLeft === 0) {
            PayolaCheckoutForm.showError(form, 'This seems to be taking too long. Please contact support and reference ID: ' + guid);
            return;
        }

        var basePath = form.getAttribute('data-payola-base-path');

        fetch(options.pollEndpoint(basePath, guid), {
            credentials: 'same-origin'
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            options.onPollSuccess(data, guid, basePath, form, retriesLeft);
        })
        .catch(function(error) {
            PayolaCheckoutForm.showError(form, error.message);
        });
    },

    // Append CSRF token to FormData
    appendCsrfToken: function(formData) {
        var csrfToken = document.querySelector('meta[name="csrf-token"]');
        if (csrfToken) {
            formData.append('authenticity_token', csrfToken.getAttribute('content'));
        }
    },

    // Submit form data via fetch and start polling
    submitAndPoll: function(form, url, formData, pollFn) {
        PayolaCheckoutForm.appendCsrfToken(formData);

        fetch(url, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        })
        .then(function(response) {
            return response.json().then(function(json) {
                if (!response.ok) throw new Error(json.error || 'Request failed');
                return json;
            });
        })
        .then(function(data) {
            pollFn(data.guid, 60);
        })
        .catch(function(error) {
            PayolaCheckoutForm.showError(form, error.message);
        });
    }
};
