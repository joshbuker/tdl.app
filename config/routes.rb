Rails.application.routes.draw do
  mount Rswag::Ui::Engine  => '/docs'
  mount Rswag::Api::Engine => '/docs'

  # For details on the DSL available within this file, see https://guides.rubyonrails.org/routing.html
  post 'login'    => 'user_sessions#create'
  delete 'logout' => 'user_sessions#destroy'
end
