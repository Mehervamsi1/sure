class LegalAcceptance < ApplicationRecord
  belongs_to :user
  belongs_to :legal_document

  validates :accepted_at, presence: true
  validates :user_id, uniqueness: { scope: :legal_document_id }

  before_validation :set_accepted_at, on: :create

  # Records that this user accepted this exact version. Idempotent: re-accepting
  # keeps the original timestamp rather than quietly moving the date someone
  # agreed to something.
  def self.record!(user:, legal_document:, ip_address: nil)
    find_or_create_by!(user: user, legal_document: legal_document) do |acceptance|
      acceptance.accepted_at = Time.current
      acceptance.ip_address_digest = Digest::SHA256.hexdigest(ip_address.to_s) if ip_address.present?
    end
  end

  private

    def set_accepted_at
      self.accepted_at ||= Time.current
    end
end
