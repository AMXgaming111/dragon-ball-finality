-- SQL commands to update existing characters with "Negative Energy" affinity to "Negative"

-- Update primary affinities
UPDATE characters 
SET primary_affinity = 'Negative' 
WHERE primary_affinity = 'Negative Energy';

-- Update secondary affinities (this is more complex due to comma-separated values)
UPDATE characters 
SET secondary_affinities = REPLACE(secondary_affinities, 'Negative Energy', 'Negative')
WHERE secondary_affinities LIKE '%Negative Energy%';

-- Query to check if any characters had the old affinity (run this first to see if updates are needed)
SELECT name, primary_affinity, secondary_affinities 
FROM characters 
WHERE primary_affinity = 'Negative Energy' 
   OR secondary_affinities LIKE '%Negative Energy%';
