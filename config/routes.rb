Rails.application.routes.draw do
  # namespace :api do
  #   resources :tasks
  # end

  post '/' => 'application#index', as: 'fuck_you'
  get ':title' => 'application#index'

  resources :tasks

  # For details on the DSL available within this file, see https://guides.rubyonrails.org/routing.html
  root to: 'application#index'
  match '*path', to: 'application#index', format: false, via: :get
end
