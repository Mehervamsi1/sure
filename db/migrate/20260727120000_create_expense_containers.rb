class CreateExpenseContainers < ActiveRecord::Migration[7.2]
  def change
    create_table :expense_containers, id: :uuid do |t|
      t.references :family, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.text :description
      t.decimal :target_amount, precision: 19, scale: 4
      t.string :currency, null: false
      t.date :starts_on
      t.date :ends_on
      t.string :status, null: false, default: "active"
      t.string :color
      t.string :lucide_icon

      t.timestamps
    end

    add_index :expense_containers, [ :family_id, :name ], unique: true
    add_index :expense_containers, [ :family_id, :status ]

    # A transaction belongs to at most one container: totals stay unambiguous
    # and there is no double counting. A payment shared between two efforts is
    # handled by splitting it and filing each child separately.
    add_reference :transactions, :expense_container, type: :uuid, null: true, foreign_key: true, index: true
  end
end
