-- Production Sessions Table (Simple Design)
-- Store all production session data in single table

-- Drop existing table if exists
IF OBJECT_ID('ProductionSessions', 'U') IS NOT NULL
    DROP TABLE ProductionSessions;

-- Create new table
CREATE TABLE ProductionSessions (
    -- Primary Key
    SessionID int IDENTITY(1,1) PRIMARY KEY,

    -- Link to production plan
    PlanID int NOT NULL,
    SessionNumber int NOT NULL, -- 1, 2, 3, 4, ...

    -- Session timing
    ActualStartDateTime datetime2 NOT NULL,
    ActualEndDateTime datetime2 NOT NULL,

    -- Production quantities (what user enters)
    SessionQuantity int NOT NULL,        -- Total produced this session
    SessionRejectQuantity int DEFAULT 0, -- Rejected/defective
    SessionReworkQuantity int DEFAULT 0, -- Need rework/fix

    -- Break/downtime in this session
    BreakMorningMinutes int DEFAULT 0,   -- Morning break
    BreakLunchMinutes int DEFAULT 0,     -- Lunch break
    BreakEveningMinutes int DEFAULT 0,   -- Evening break
    SetupMinutes int DEFAULT 0,          -- Setup time
    DowntimeMinutes int DEFAULT 0,       -- Machine downtime
    DowntimeReason nvarchar(500),        -- Why machine was down

    -- Quality notes and additional info
    QualityRemark nvarchar(MAX),         -- Quality remarks
    Notes nvarchar(1000),                -- General notes

    -- Audit Trail
    CreatedAt datetime2 DEFAULT GETDATE(),
    CreatedBy nvarchar(100) DEFAULT 'User',

    -- Foreign Key Constraints
    CONSTRAINT FK_ProductionSessions_PlanID
        FOREIGN KEY (PlanID) REFERENCES ProductionPlans(PlanID)
        ON DELETE CASCADE,

    -- Unique Constraints
    CONSTRAINT UQ_ProductionSessions_PlanSession
        UNIQUE (PlanID, SessionNumber)
);

-- Create indexes for better query performance
CREATE INDEX IX_ProductionSessions_PlanID ON ProductionSessions(PlanID);
CREATE INDEX IX_ProductionSessions_CreatedAt ON ProductionSessions(CreatedAt);

-- Add computed column for good quantity
ALTER TABLE ProductionSessions
ADD SessionGoodQuantity AS (SessionQuantity - SessionRejectQuantity) PERSISTED;

PRINT '✅ ProductionSessions table created successfully (Simple Design)';

-- Show table structure
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ProductionSessions'
ORDER BY ORDINAL_POSITION;
