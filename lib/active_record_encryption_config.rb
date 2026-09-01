# frozen_string_literal: true

module ActiveRecordEncryptionConfig
  ENV_KEYS = %w[
    ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY
    ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY
    ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT
  ].freeze

  CONFIG_KEYS = %i[
    primary_key
    deterministic_key
    key_derivation_salt
  ].freeze

  module_function

  # The self-hosted fallback derives all three keys from SECRET_KEY_BASE. That
  # is convenient but couples them: rotating SECRET_KEY_BASE silently changes
  # every key and orphans all existing ciphertext.
  #
  # Pinning these exact derived values into the environment breaks that coupling
  # WITHOUT touching any data - the keys are identical, so nothing needs
  # re-encrypting and SECRET_KEY_BASE becomes safe to rotate afterwards.
  # Generating genuinely new keys is a separate operation (see
  # `rails encryption:reencrypt`), which does rewrite every encrypted value.
  def derived_from_secret(secret_key_base)
    {
      primary_key: Digest::SHA256.hexdigest("#{secret_key_base}:primary_key")[0..63],
      deterministic_key: Digest::SHA256.hexdigest("#{secret_key_base}:deterministic_key")[0..63],
      key_derivation_salt: Digest::SHA256.hexdigest("#{secret_key_base}:key_derivation_salt")[0..63]
    }
  end

  def complete_env?(env = ENV)
    ENV_KEYS.all? { |key| env_value_present?(env, key) }
  end

  def partial_env?(env = ENV)
    present_count = ENV_KEYS.count { |key| env_value_present?(env, key) }
    present_count.positive? && present_count < ENV_KEYS.count
  end

  def missing_env_keys(env = ENV)
    ENV_KEYS.reject { |key| env_value_present?(env, key) }
  end

  def partial_env_message(env = ENV)
    "Active Record encryption environment variables are partially configured. Missing: #{missing_env_keys(env).join(', ')}"
  end

  def credentials_configured?(credentials = Rails.application.credentials)
    credentials.active_record_encryption.present?
  rescue NoMethodError
    false
  end

  def runtime_configured?(config = Rails.application.config.active_record.encryption)
    CONFIG_KEYS.all? { |key| config.public_send(key).present? }
  rescue NoMethodError
    false
  end

  def explicitly_configured?
    complete_env? || credentials_configured?
  end

  def ready?
    explicitly_configured? || runtime_configured?
  end

  def env_value_present?(env, key)
    env[key].present?
  end
end
