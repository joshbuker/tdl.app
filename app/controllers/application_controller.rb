class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception

  # Typically you don't have routable methods in ApplicationController, as it's
  # intended more as an abstract controller to inherit from. With this however,
  # we're delegating all rendering to Vue as a single page application.
  def index
    if params[:title].present?
      if Task.where('title iLIKE :title', title: "%#{params[:title]}%").any?
        @tasks = Task.where('title iLIKE :title', title: "%#{params[:title]}%")
      else
        @tasks = nil
      end
    elsif params[:task].present? && params[:task][:title].present?
      if Task.where('title iLIKE :title', title: "%#{params[:task][:title]}%").any?
        @tasks = Task.where('title iLIKE :title', title: "%#{params[:task][:title]}%")
      else
        @tasks = nil
      end
    else
      @tasks = Task.all
    end
    # byebug
    render template: 'application/index'
  end
end
