-- The benchmark import upserts by benchmark code and profile version.
-- Keep that natural key unique for existing databases as well as fresh ones.
ALTER TABLE benchmark_profiles
  ADD CONSTRAINT benchmark_profiles_code_version_key
  UNIQUE (benchmark_code, profile_version);
