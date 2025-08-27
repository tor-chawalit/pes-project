-- Add SetupNote, SetupMinutes and Break time columns to ProductionPlans table
USE [PES]
GO

-- Add SetupMinutes column
ALTER TABLE ProductionPlans 
ADD SetupMinutes INT DEFAULT 0;

-- Add SetupNote column  
ALTER TABLE ProductionPlans 
ADD SetupNote NVARCHAR(MAX) NULL;

-- Add Break time columns
ALTER TABLE ProductionPlans 
ADD BreakMorningMinutes INT DEFAULT 0;

ALTER TABLE ProductionPlans 
ADD BreakLunchMinutes INT DEFAULT 0;

ALTER TABLE ProductionPlans 
ADD BreakEveningMinutes INT DEFAULT 0;

-- Add constraints
ALTER TABLE ProductionPlans
ADD CONSTRAINT CK_ProductionPlans_SetupMinutes 
CHECK (SetupMinutes >= 0);

ALTER TABLE ProductionPlans
ADD CONSTRAINT CK_ProductionPlans_BreakMorningMinutes 
CHECK (BreakMorningMinutes >= 0);

ALTER TABLE ProductionPlans
ADD CONSTRAINT CK_ProductionPlans_BreakLunchMinutes 
CHECK (BreakLunchMinutes >= 0);

ALTER TABLE ProductionPlans
ADD CONSTRAINT CK_ProductionPlans_BreakEveningMinutes 
CHECK (BreakEveningMinutes >= 0);

-- Verify the changes
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ProductionPlans' 
AND COLUMN_NAME IN ('SetupMinutes', 'SetupNote', 'BreakMorningMinutes', 'BreakLunchMinutes', 'BreakEveningMinutes')
ORDER BY ORDINAL_POSITION;
