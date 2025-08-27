-- Add SubDepartmentID column to ProductionPlans table
USE [PES]
GO

-- Add SubDepartmentID column (for primary sub-department)
ALTER TABLE ProductionPlans 
ADD SubDepartmentID INT NULL;

-- Add foreign key constraint
ALTER TABLE ProductionPlans
ADD CONSTRAINT FK_ProductionPlans_SubDepartmentID 
FOREIGN KEY (SubDepartmentID) REFERENCES SubDepartments(SubDepartmentID);

-- Add index for performance
CREATE INDEX IX_ProductionPlans_SubDepartmentID 
ON ProductionPlans (SubDepartmentID);

-- Verify the changes
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ProductionPlans' 
AND COLUMN_NAME = 'SubDepartmentID';
