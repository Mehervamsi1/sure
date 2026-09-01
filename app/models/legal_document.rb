class LegalDocument < ApplicationRecord
  has_many :legal_acceptances, dependent: :destroy
  has_many :accepting_users, through: :legal_acceptances, source: :user

  KINDS = %w[terms privacy].freeze

  validates :kind, presence: true, inclusion: { in: KINDS }
  validates :version, presence: true
  validates :locale, presence: true
  validates :effective_at, presence: true
  validates :body, presence: true
  validates :version, uniqueness: { scope: [ :kind, :locale ] }

  scope :in_effect, -> { where(arel_table[:effective_at].lteq(Time.current)) }
  scope :of_kind, ->(kind) { where(kind: kind) }

  class << self
    # The version people are currently bound by: the newest one whose effective
    # date has passed. A future-dated row can therefore be staged in advance
    # without prompting anyone until it takes effect.
    def current(kind, locale: "en")
      of_kind(kind).in_effect.where(locale: locale).order(effective_at: :desc, created_at: :desc).first ||
        of_kind(kind).in_effect.where(locale: "en").order(effective_at: :desc, created_at: :desc).first
    end

    # Every document a user must have accepted before using the app.
    def current_required(locale: "en")
      KINDS.filter_map { |kind| current(kind, locale: locale) }
    end
  end

  def accepted_by?(user)
    legal_acceptances.exists?(user: user)
  end

  def title
    I18n.t("legal_documents.kinds.#{kind}", default: kind.titleize)
  end
end
