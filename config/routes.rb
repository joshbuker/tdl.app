Rails.application.routes.draw do
  post 'tasks/search' => 'tasks#search'
  get 'tasks/search/:title' => 'tasks#search'
  # FIXME: Using post to allow passing params outside of URL
  post 'tasks/today' => 'tasks#today'
  post 'tasks/tomorrow' => 'tasks#tomorrow'
  post 'tasks/upcoming' => 'tasks#upcoming'
  post 'tasks/someday' => 'tasks#someday'

  post 'tasks/clear-completed' => 'tasks#clear_completed'

  post 'login' => 'sessions#create'
  post 'logout' => 'sessions#destroy'

  resources :tasks, except: [:show, :new, :edit], defaults: { format: :json } do
    get 'prereqs' => 'tasks#prereqs'
    get 'postreqs' => 'tasks#postreqs'
    patch 'complete' => 'tasks#mark_task_complete'
    patch 'incomplete' => 'tasks#mark_task_incomplete'
    patch 'pre' => 'tasks#add_prerequisite'
    patch 'post' => 'tasks#add_postrequisite'
    delete 'pre/:pre_task_id' => 'tasks#remove_prerequisite'
    delete 'post/:post_task_id' => 'tasks#remove_postrequisite'
    patch 'tags' => 'tasks#update_tags'
    patch 'list' => 'tasks#update_list'
    patch 'notes' => 'tasks#update_notes'
    patch 'remind-me-at' => 'tasks#update_remind_me_at'
    patch 'order' => 'tasks#update_order'
  end

  resources :lists, only: [:index, :create, :destroy], defaults: { format: :json }
  resources :tags, only: [:index, :create, :destroy], defaults: { format: :json }

  # For details on the DSL available within this file, see https://guides.rubyonrails.org/routing.html
  root to: 'home#index'
  # match '*path', to: 'home#index', format: false, via: :get
end
