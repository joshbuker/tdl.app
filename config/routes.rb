Rails.application.routes.draw do
  post 'tasks/search' => 'tasks#search'
  get 'tasks/search/:title' => 'tasks#search'
  get 'tasks/today' => 'tasks#today'
  get 'tasks/tomorrow' => 'tasks#tomorrow'
  get 'tasks/upcoming' => 'tasks#upcoming'
  get 'tasks/someday' => 'tasks#someday'

  post 'login' => 'sessions#create'
  post 'logout' => 'sessions#destroy'

  resources :tasks, except: [:show, :new, :edit], defaults: { format: :json } do
    get 'prereqs' => 'tasks#prereqs'
    get 'postreqs' => 'tasks#postreqs'
    patch 'complete' => 'tasks#mark_task_complete'
    patch 'incomplete' => 'tasks#mark_task_incomplete'
  end

  resources :lists, only: [:index], defaults: { format: :json }
  resources :tags, only: [:index], defaults: { format: :json }

  # For details on the DSL available within this file, see https://guides.rubyonrails.org/routing.html
  get 'old-prototype' => 'application#old_prototype'
  root to: 'application#index'
  # match '*path', to: 'application#index', format: false, via: :get
end
