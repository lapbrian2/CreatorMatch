-- PostGIS geometry sync + GIST index.
-- Run AFTER `prisma migrate dev` (or `prisma db push`) so that the latitude /
-- longitude columns and the Unsupported `location` column already exist.
--
-- Idempotent: re-running this file is safe.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- creator_profiles
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_creator_location() RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    NEW.location := NULL;
  ELSE
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS creator_profiles_sync_location ON creator_profiles;
CREATE TRIGGER creator_profiles_sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON creator_profiles
  FOR EACH ROW EXECUTE FUNCTION sync_creator_location();

-- Backfill existing rows
UPDATE creator_profiles
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;

CREATE INDEX IF NOT EXISTS creator_profiles_location_gist
  ON creator_profiles USING GIST(location);

-- ---------------------------------------------------------------------------
-- business_profiles
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_business_location() RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    NEW.location := NULL;
  ELSE
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_profiles_sync_location ON business_profiles;
CREATE TRIGGER business_profiles_sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON business_profiles
  FOR EACH ROW EXECUTE FUNCTION sync_business_location();

UPDATE business_profiles
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;

CREATE INDEX IF NOT EXISTS business_profiles_location_gist
  ON business_profiles USING GIST(location);
