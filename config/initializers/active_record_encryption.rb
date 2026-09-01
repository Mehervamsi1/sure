require Rails.root.join("lib/active_record_encryption_config").to_s

# Configure Active Record encryption keys
# Priority order:
# 1. Environment variables (works for both managed and self-hosted modes)
# 2. Auto-generation from SECRET_KEY_BASE (self-hosted only, if credentials not present)
# 3. Rails credentials (fallback, handled in application.rb)

# Check if keys are provided via environment variables
primary_key = ENV["ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY"]
deterministic_key = ENV["ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY"]
key_derivation_salt = ENV["ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT"]

if ActiveRecordEncryptionConfig.partial_env?
  raise ActiveRecordEncryptionConfig.partial_env_message
end

# If all environment variables are present, use them (works for both managed and self-hosted)
if ActiveRecordEncryptionConfig.complete_env?
  Rails.application.config.active_record.encryption.primary_key = primary_key
  Rails.application.config.active_record.encryption.deterministic_key = deterministic_key
  Rails.application.config.active_record.encryption.key_derivation_salt = key_derivation_salt
elsif Rails.application.config.app_mode.self_hosted? && !Rails.application.credentials.active_record_encryption.present?
  # For self-hosted instances without credentials or env vars, auto-generate keys
  # Use SECRET_KEY_BASE as the seed for deterministic key generation
  # This ensures keys are consistent across container restarts
  # Single source of truth for the derivation, so the pinning task below cannot
  # drift from what the app actually uses.
  derived = ActiveRecordEncryptionConfig.derived_from_secret(Rails.application.secret_key_base)
  primary_key = derived[:primary_key]
  deterministic_key = derived[:deterministic_key]
  key_derivation_salt = derived[:key_derivation_salt]

  # Configure Active Record encryption
  Rails.application.config.active_record.encryption.primary_key = primary_key
  Rails.application.config.active_record.encryption.deterministic_key = deterministic_key
  Rails.application.config.active_record.encryption.key_derivation_salt = key_derivation_salt
end
# If none of the above conditions are met, credentials from application.rb will be used

# --- Key rotation support -----------------------------------------------------
#
# Rotating to genuinely new keys is a two-phase operation. Existing rows are
# still encrypted with the old key, so the old key must remain readable until
# every row has been rewritten:
#
#   1. set ACTIVE_RECORD_ENCRYPTION_PREVIOUS_* to the outgoing keys and deploy.
#      Both old and new ciphertext decrypt, and `extend_queries` makes lookups
#      on deterministic columns (users.email, users.otp_secret) match rows
#      encrypted under either key — without it, sign-in breaks for everyone not
#      yet migrated.
#   2. run `rails encryption:reencrypt`, then remove the PREVIOUS_* variables.
#
# Skipping step 1 makes every existing encrypted value unreadable.
previous_primary = ENV["ACTIVE_RECORD_ENCRYPTION_PREVIOUS_PRIMARY_KEY"].presence
previous_deterministic = ENV["ACTIVE_RECORD_ENCRYPTION_PREVIOUS_DETERMINISTIC_KEY"].presence
previous_salt = ENV["ACTIVE_RECORD_ENCRYPTION_PREVIOUS_KEY_DERIVATION_SALT"].presence

if previous_primary.present?
  Rails.application.config.active_record.encryption.previous = [
    {
      primary_key: previous_primary,
      deterministic_key: previous_deterministic || previous_primary,
      key_derivation_salt: previous_salt
    }.compact
  ]

  # Required for deterministic lookups to find rows still encrypted with the
  # previous key. Defaults to false, which is the trap.
  Rails.application.config.active_record.encryption.extend_queries = true
end
