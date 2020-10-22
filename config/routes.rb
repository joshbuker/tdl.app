Rails.application.routes.draw do
  post 'tasks/search' => 'tasks#search'
  get 'tasks/search/:title' => 'tasks#search'
  # FIXME: Using post to allow passing params outside of URL
  post 'tasks/today' => 'tasks#today'
  post 'tasks/tomorrow' => 'tasks#tomorrow'
  post 'tasks/upcoming' => 'tasks#upcoming'
  post 'tasks/someday' => 'tasks#someday'
  post 'tasks/treeview' => 'tasks#treeview'

  post 'tasks/clear-completed' => 'tasks#clear_completed'
  get 'tags/no-tags-count' => 'tags#no_tags_count'

  post 'login' => 'sessions#create'
  post 'logout' => 'sessions#destroy'

  resources :tasks, except: [:show, :new, :edit], defaults: { format: :json } do
    get 'prereqs' => 'tasks#prereqs'
    get 'postreqs' => 'tasks#postreqs'
    get 'tree-postreqs' => 'tasks#tree_postreqs'
    patch 'complete' => 'tasks#mark_task_complete'
    patch 'incomplete' => 'tasks#mark_task_incomplete'
    patch 'pre' => 'tasks#add_prerequisite'
    patch 'post' => 'tasks#add_postrequisite'
    delete 'pre/:pre_task_id' => 'tasks#remove_prerequisite'
    delete 'post/:post_task_id' => 'tasks#remove_postrequisite'
    patch 'tags' => 'tasks#update_tags'
    patch 'list' => 'tasks#update_list'
    patch 'notes' => 'tasks#update_notes'
    patch 'review-at' => 'tasks#update_review_at'
    patch 'order' => 'tasks#update_order'
  end

  resources :lists, except: [:show, :new, :edit], defaults: { format: :json }
  resources :tags, except: [:show, :new, :edit], defaults: { format: :json }

  get 'timezone' => 'users#timezone'
  patch 'timezone' => 'users#update_timezone'

  # For details on the DSL available within this file, see https://guides.rubyonrails.org/routing.html
  root to: 'home#index'
  # match '*path', to: 'home#index', format: false, via: :get
end
