require "test_helper"

# Uploads were sitting on the container's ephemeral disk: lost on every deploy
# and unreadable by the worker, which runs in a separate container. These guard
# the configuration that moves them to durable object storage.
class ActiveStorageServiceConfigTest < ActiveSupport::TestCase
  test "generic_s3 is configured for S3-compatible endpoints" do
    config = Rails.configuration.active_storage.service_configurations["generic_s3"]

    assert_equal "S3", config["service"]
    assert config.key?("endpoint"), "a custom endpoint is what makes this generic"
    assert config.key?("force_path_style"), "Supabase and MinIO require path-style addressing"
  end

  test "generic_s3 disables default checksums that S3-compatible endpoints reject" do
    config = Rails.configuration.active_storage.service_configurations["generic_s3"]

    # aws-sdk-s3 >= 1.178 sends CRC32 headers by default; Supabase Storage
    # rejects them and the failure surfaces as an opaque signature error.
    assert_equal "when_required", config["request_checksum_calculation"]
    assert_equal "when_required", config["response_checksum_validation"]
  end

  test "the service is selected by env so staging and production can differ" do
    # Guards against someone hardcoding a service and silently sending one
    # environment's uploads into another's bucket.
    production_config = Rails.root.join("config/environments/production.rb").read

    assert_match(/ACTIVE_STORAGE_SERVICE/, production_config)
  end

  test "attachments round-trip through whichever service is configured" do
    statement = AccountStatement.new(
      family: families(:dylan_family),
      filename: "round-trip.csv",
      content_type: "text/csv",
      byte_size: 12,
      checksum: Digest::MD5.base64digest("date,amount\n"),
      content_sha256: Digest::SHA256.hexdigest("date,amount\n"),
      source: :manual_upload,
      upload_status: :stored,
      review_status: :unmatched,
      currency: families(:dylan_family).currency
    )

    statement.original_file.attach(
      io: StringIO.new("date,amount\n"),
      filename: "round-trip.csv",
      content_type: "text/csv"
    )
    statement.save!

    assert statement.original_file.attached?
    assert_equal "date,amount\n", statement.original_file.download,
      "a stored attachment must be readable back out again"
  end
end
