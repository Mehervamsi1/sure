class ExpenseContainer < ApplicationRecord
  belongs_to :family
  has_many :transactions, dependent: :nullify

  STATUSES = %w[active archived].freeze
  COLORS = Tag::COLORS

  validates :name, presence: true, uniqueness: { scope: :family }
  validates :currency, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :target_amount, numericality: { greater_than: 0 }, allow_nil: true
  validates :color, format: { with: /\A#[0-9A-Fa-f]{6}\z/ }, allow_nil: true
  validate :ends_on_after_starts_on

  scope :alphabetically, -> { order(:name) }
  scope :active, -> { where(status: "active") }
  scope :archived, -> { where(status: "archived") }

  # A container groups spend across categories (a trip, a renovation, a
  # project). Transactions still appear in the normal list; the container is an
  # additional lens, not a filter that hides them.
  #
  # Measured the same way the rest of the app measures spend: outflows are
  # positive and inflows negative, transfers / credit-card payments / one-offs
  # are not spending (Transaction::BUDGET_EXCLUDED_KINDS), and entries the user
  # marked excluded are ignored. Refunds inside the container still net off,
  # which is what you want for "what did this trip cost me".
  def total_spent
    spendable_entries.sum(:amount)
  end

  def transactions_count
    transactions.count
  end

  def remaining
    return nil if target_amount.nil?

    target_amount - total_spent
  end

  def progress_percent
    return nil if target_amount.nil? || target_amount.zero?

    ((total_spent / target_amount) * 100).to_f.clamp(0, 100).round
  end

  def over_budget?
    target_amount.present? && total_spent > target_amount
  end

  def active?
    status == "active"
  end

  def archive!
    update!(status: "archived")
  end

  def activate!
    update!(status: "active")
  end

  private

    def entries
      Entry.where(entryable_type: "Transaction", entryable_id: transactions.select(:id))
    end

    def spendable_entries
      entries
        .where(excluded: false)
        .where(entryable_id: transactions.where.not(kind: Transaction::BUDGET_EXCLUDED_KINDS).select(:id))
    end

    def ends_on_after_starts_on
      return if starts_on.blank? || ends_on.blank?
      return if ends_on >= starts_on

      errors.add(:ends_on, :must_be_after_start_date)
    end
end
