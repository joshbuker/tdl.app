class SorceryCore < ActiveRecord::Migration[6.0]
  def change
    change_table :users do |t|
      # Sorcery - Crypted Password Module
      t.string  :crypted_password
      t.string  :salt

      # Sorcery - Brute Force Protection Module
      t.integer   :failed_logins_count, default: 0
      t.datetime  :lock_expires_at,     default: nil
      t.string    :unlock_token,        default: nil

      # Sorcery - Activity Logging Module
      t.datetime  :last_login_at, default: nil
      t.datetime  :last_logout_at, default: nil
      t.datetime  :last_activity_at, default: nil
      t.string    :last_login_from_ip_address, default: nil
    end
  end
end
