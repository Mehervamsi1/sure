class CreateLegalDocuments < ActiveRecord::Migration[8.1]
  def change
    create_table :legal_documents, id: :uuid do |t|
      t.string :kind, null: false          # terms | privacy
      t.string :version, null: false       # human-readable, e.g. "2026-09-01"
      t.string :locale, null: false, default: "en"
      t.datetime :effective_at, null: false
      t.text :body, null: false
      t.text :summary_of_changes

      t.timestamps
    end

    add_index :legal_documents, [ :kind, :version, :locale ], unique: true
    add_index :legal_documents, [ :kind, :locale, :effective_at ]

    # Which version a person accepted, and when. Versioned rather than a boolean
    # so it can be shown exactly what someone agreed to on a given date.
    create_table :legal_acceptances, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.references :legal_document, null: false, foreign_key: true, type: :uuid
      t.datetime :accepted_at, null: false
      # Digest rather than the address itself: enough to evidence acceptance
      # without retaining an identifier that was never needed in the clear.
      t.string :ip_address_digest

      t.timestamps
    end

    add_index :legal_acceptances, [ :user_id, :legal_document_id ], unique: true
  end
end
