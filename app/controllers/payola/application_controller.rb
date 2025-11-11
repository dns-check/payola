module Payola
  class ApplicationController < ::ApplicationController
    helper PriceHelper

    # Custom error for when no referrer is available for redirect_back
    class RedirectBackError < StandardError; end

    private

    def return_to
      return params[:return_to] if params[:return_to]
      request.headers["Referer"] or raise RedirectBackError
    end

  end
end
