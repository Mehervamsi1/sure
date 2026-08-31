class AddExpiryToSessions < ActiveRecord::Migration[7.2]
  def up
    add_column :sessions, :last_active_at, :datetime
    add_column :sessions, :expires_at, :datetime
    add_index :sessions, :expires_at

    # Existing sessions were created under a 20-year cookie with no server-side
    # expiry. Give them the new absolute lifetime measured from their creation,
    # and seed activity from updated_at so an idle one expires on the next
    # sweep rather than being treated as freshly active.
    execute <<~SQL
      UPDATE sessions
      SET last_active_at = updated_at,
          expires_at = created_at + INTERVAL '#{Session.absolute_lifetime.to_i} seconds'
    SQL
  end

  def down
    remove_index :sessions, :expires_at
    remove_column :sessions, :expires_at
    remove_column :sessions, :last_active_at
  end
end
