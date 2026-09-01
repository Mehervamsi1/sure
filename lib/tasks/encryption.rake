namespace :encryption do
  desc "Print the encryption keys currently in use so they can be pinned into the environment"
  task pin_keys: :environment do
    if ActiveRecordEncryptionConfig.complete_env?
      puts "Keys are already pinned via environment variables. Nothing to do."
      next
    end

    unless Rails.application.config.app_mode.self_hosted?
      abort "Only the self-hosted fallback derives keys from SECRET_KEY_BASE."
    end

    derived = ActiveRecordEncryptionConfig.derived_from_secret(Rails.application.secret_key_base)

    puts <<~TEXT
      These are the keys this instance is ALREADY using, derived from SECRET_KEY_BASE.

      Setting them explicitly changes nothing about your data — the values are
      identical, so no re-encryption is needed. What it changes is the coupling:
      once pinned, SECRET_KEY_BASE can be rotated without orphaning every
      encrypted value.

      Set these, then redeploy:

        ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY=#{derived[:primary_key]}
        ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY=#{derived[:deterministic_key]}
        ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT=#{derived[:key_derivation_salt]}

      Treat them as secrets: they decrypt every encrypted column.
    TEXT
  end

  desc "List every encrypted attribute in the app"
  task attributes: :environment do
    Rails.application.eager_load!

    ActiveRecord::Base.descendants.sort_by(&:name).each do |model|
      next if model.abstract_class?

      attributes = begin
        model.encrypted_attributes.to_a
      rescue StandardError
        []
      end
      next if attributes.empty?

      deterministic = attributes.select do |attribute|
        type = model.type_for_attribute(attribute)
        type.respond_to?(:scheme) && type.scheme.respond_to?(:deterministic?) && type.scheme.deterministic?
      rescue StandardError
        false
      end

      puts "#{model.name}: #{attributes.join(', ')}"
      puts "  deterministic (used in lookups): #{deterministic.join(', ')}" if deterministic.any?
    end
  end

  desc "Re-encrypt every encrypted attribute with the current key (DRY_RUN=true to count only)"
  task reencrypt: :environment do
    dry_run = ActiveModel::Type::Boolean.new.cast(ENV.fetch("DRY_RUN", "false"))

    unless ENV["ACTIVE_RECORD_ENCRYPTION_PREVIOUS_PRIMARY_KEY"].present? || dry_run
      abort <<~TEXT
        Refusing to run: ACTIVE_RECORD_ENCRYPTION_PREVIOUS_PRIMARY_KEY is not set.

        Existing rows are encrypted with the outgoing key. Without it configured
        as `previous`, those rows cannot be decrypted and this task would
        destroy them. See config/initializers/active_record_encryption.rb.
      TEXT
    end

    Rails.application.eager_load!

    models = ActiveRecord::Base.descendants.reject(&:abstract_class?).select do |model|
      model.encrypted_attributes.present?
    rescue StandardError
      false
    end

    models.sort_by(&:name).each do |model|
      total = model.count
      done = 0
      failed = 0

      print "#{model.name} (#{total} rows, #{model.encrypted_attributes.to_a.join(', ')}): "

      unless dry_run
        model.find_each(batch_size: 200) do |record|
          record.encrypt
          done += 1
        rescue StandardError => e
          failed += 1
          Rails.logger.error("[encryption:reencrypt] #{model.name}##{record.id}: #{e.class}: #{e.message}")
        end
      end

      puts dry_run ? "would re-encrypt #{total}" : "re-encrypted #{done}#{failed.positive? ? ", FAILED #{failed}" : ''}"
    end

    puts
    puts "Now remove the ACTIVE_RECORD_ENCRYPTION_PREVIOUS_* variables and redeploy." unless dry_run
  end
end
