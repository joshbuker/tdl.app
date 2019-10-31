Rails.application.routes.draw do
  resources :tasks, except: [:new, :edit], defaults: { format: :json }

  get ':title' => 'application#index'

  # For details on the DSL available within this file, see https://guides.rubyonrails.org/routing.html
  root to: 'application#index'
  match '*path', to: 'application#index', format: false, via: :get
end
