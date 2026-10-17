-- Ensure batch numbers cannot be duplicated across the database
CREATE UNIQUE INDEX IF NOT EXISTS batches_batch_no_idx 
ON batches (batch_no) 
WHERE batch_no IS NOT NULL;
