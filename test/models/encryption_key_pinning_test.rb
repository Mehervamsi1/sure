require "test_helper"

# Encryption keys are derived from SECRET_KEY_BASE unless pinned explicitly,
# which means rotating SECRET_KEY_BASE would orphan every encrypted value.
class EncryptionKeyPinningTest < ActiveSupport::TestCase
  test "derivation is stable for the same secret" do
    first = ActiveRecordEncryptionConfig.derived_from_secret("secret-abc")
    second = ActiveRecordEncryptionConfig.derived_from_secret("secret-abc")

    assert_equal first, second,
      "keys must survive a container restart, so derivation cannot vary"
  end

  test "each derived key is distinct" do
    keys = ActiveRecordEncryptionConfig.derived_from_secret("secret-abc")

    assert_equal 3, keys.values.uniq.size,
      "primary, deterministic and salt must not collide"
    keys.each_value { |key| assert_equal 64, key.length }
  end

  test "a different secret derives entirely different keys" do
    a = ActiveRecordEncryptionConfig.derived_from_secret("secret-abc")
    b = ActiveRecordEncryptionConfig.derived_from_secret("secret-xyz")

    # This is precisely the hazard: change SECRET_KEY_BASE and every key moves,
    # so previously encrypted values can no longer be read.
    assert_empty a.values & b.values
  end

  test "pinning the derived values is a no-op for ciphertext" do
    secret = Rails.application.secret_key_base
    derived = ActiveRecordEncryptionConfig.derived_from_secret(secret)

    # Pinning must reproduce exactly what the self-hosted fallback computes,
    # otherwise "pinning" would silently be a key rotation.
    assert_equal Digest::SHA256.hexdigest("#{secret}:primary_key")[0..63], derived[:primary_key]
    assert_equal Digest::SHA256.hexdigest("#{secret}:deterministic_key")[0..63], derived[:deterministic_key]
    assert_equal Digest::SHA256.hexdigest("#{secret}:key_derivation_salt")[0..63], derived[:key_derivation_salt]
  end

  test "complete_env? recognises a fully pinned environment" do
    env = {
      "ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY" => "a",
      "ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY" => "b",
      "ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT" => "c"
    }

    assert ActiveRecordEncryptionConfig.complete_env?(env)
    assert_not ActiveRecordEncryptionConfig.partial_env?(env)
  end

  test "a partially pinned environment is detected rather than half-applied" do
    env = { "ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY" => "a" }

    assert ActiveRecordEncryptionConfig.partial_env?(env)
    assert_not ActiveRecordEncryptionConfig.complete_env?(env)
    assert_includes ActiveRecordEncryptionConfig.partial_env_message(env),
      "ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY"
  end

  test "encrypted attributes still round-trip under the configured keys" do
    user = users(:family_admin)
    original = user.email

    user.encrypt
    user.reload

    assert_equal original, user.email,
      "re-encrypting must not change the readable value"
  end

  test "deterministic lookups keep working after re-encryption" do
    user = users(:family_admin)
    email = user.email

    user.encrypt

    # users.email is deterministic precisely so sign-in can look it up. If a key
    # change broke this, authentication would fail for every migrated user.
    assert_equal user, User.find_by(email: email)
  end
end
