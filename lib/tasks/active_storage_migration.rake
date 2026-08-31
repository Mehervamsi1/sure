namespace :active_storage do
  desc "Copy blobs from one Active Storage service to another (SOURCE=local TARGET=generic_s3 [DRY_RUN=true])"
  task migrate_service: :environment do
    source_name = ENV.fetch("SOURCE", "local").to_sym
    target_name = ENV.fetch("TARGET") { abort "TARGET is required (e.g. TARGET=generic_s3)" }.to_sym
    dry_run = ActiveModel::Type::Boolean.new.cast(ENV.fetch("DRY_RUN", "false"))

    source = ActiveStorage::Blob.services.fetch(source_name)
    target = ActiveStorage::Blob.services.fetch(target_name)

    blobs = ActiveStorage::Blob.where(service_name: source_name.to_s)

    puts "#{dry_run ? '[DRY RUN] ' : ''}Migrating #{blobs.count} blob(s): #{source_name} -> #{target_name}"

    moved = 0
    missing = []
    failed = []

    blobs.find_each do |blob|
      # Files on an ephemeral container disk disappear on redeploy while their
      # database rows survive, so a missing file is expected here rather than
      # exceptional. Report it instead of aborting the run.
      unless source.exist?(blob.key)
        missing << blob
        next
      end

      if dry_run
        moved += 1
        next
      end

      begin
        source.open(blob.key, checksum: blob.checksum) do |file|
          target.upload(blob.key, file, checksum: blob.checksum, content_type: blob.content_type)
        end
        blob.update_column(:service_name, target_name.to_s)
        moved += 1
      rescue StandardError => e
        failed << [ blob, e ]
      end
    end

    puts "  moved:   #{moved}"
    puts "  missing: #{missing.count}"
    missing.each { |blob| puts "    - #{blob.filename} (#{blob.byte_size} bytes, #{blob.created_at.to_date}) — file gone from #{source_name}" }

    if failed.any?
      puts "  failed:  #{failed.count}"
      failed.each { |blob, error| puts "    - #{blob.filename}: #{error.class}: #{error.message}" }
    end

    if missing.any? && !dry_run
      puts
      puts "Rows for missing files were left pointing at #{source_name}. They reference data that"
      puts "no longer exists; purge them deliberately rather than leaving broken attachments."
    end
  end

  desc "Report which blobs still have a readable file, per service"
  task audit: :environment do
    ActiveStorage::Blob.group(:service_name).count.each do |service_name, count|
      service = ActiveStorage::Blob.services.fetch(service_name.to_sym)
      present = ActiveStorage::Blob.where(service_name: service_name).count { |blob| service.exist?(blob.key) }
      puts "#{service_name}: #{count} row(s), #{present} with a readable file"
    end
  end
end
