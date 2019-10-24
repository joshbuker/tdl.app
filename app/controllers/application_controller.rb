class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception

  # Typically you don't have routable methods in ApplicationController, as it's
  # intended more as an abstract controller to inherit from. With this however,
  # we're delegating all rendering to Vue as a single page application.
  def index
    render template: 'application/index'
  end
end
