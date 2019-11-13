Rails.application.routes.draw do
  get 'tasks/search' => 'tasks#index'
  get 'tasks/search/:title' => 'tasks#index'

  resources :tasks, except: [:show, :new, :edit], defaults: { format: :json } do
    patch 'complete' => 'tasks#mark_task_complete'
    patch 'incomplete' => 'tasks#mark_task_incomplete'
  end

  # For details on the DSL available within this file, see https://guides.rubyonrails.org/routing.html
  get 'old-prototype' => 'application#old_prototype'
  root to: 'application#index'
  # match '*path', to: 'application#index', format: false, via: :get
end
