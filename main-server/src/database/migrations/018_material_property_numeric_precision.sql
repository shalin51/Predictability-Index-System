-- Allow scientific material properties such as volume resistivity above 10^14.
ALTER TABLE material_property_facts
  ALTER COLUMN value_numeric TYPE NUMERIC(38,10);
