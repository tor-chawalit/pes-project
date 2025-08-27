-- ตาราง ProductionSessions แบบเรียบง่าย
-- เก็บข้อมูล session การผลิตแต่ละครั้ง

-- ลบตารางเก่าถ้ามี
IF OBJECT_ID('ProductionSessions', 'U') IS NOT NULL
    DROP TABLE ProductionSessions;

-- สร้างตารางใหม่
CREATE TABLE ProductionSessions (
    -- Primary Key
    SessionID int IDENTITY(1,1) PRIMARY KEY,
    
    -- เชื่อมโยงกับแผนงาน
    PlanID int NOT NULL,
    SessionNumber int NOT NULL, -- 1, 2, 3, 4, ...
    
    -- เวลาของ Session นี้
    ActualStartDateTime datetime2 NOT NULL,
    ActualEndDateTime datetime2 NOT NULL,
    
    -- ผลผลิต Session นี้ (ข้อมูลที่ User กรอกเอง)
    SessionQuantity int NOT NULL,        -- ผลิตได้ทั้งหมด
    SessionRejectQuantity int DEFAULT 0, -- ของเสีย
    SessionReworkQuantity int DEFAULT 0, -- งานที่ต้องแก้ไข/ทำใหม่
    
    -- เวลาพัก/หยุดใน Session นี้
    BreakMorningMinutes int DEFAULT 0,   -- พักเช้า
    BreakLunchMinutes int DEFAULT 0,     -- พักกลางวัน  
    BreakEveningMinutes int DEFAULT 0,   -- พักเย็น
    SetupMinutes int DEFAULT 0,          -- เวลาเตรียมเครื่อง
    DowntimeMinutes int DEFAULT 0,       -- เวลาหยุดเครื่อง
    DowntimeReason nvarchar(500),        -- สาเหตุที่หยุด
    
    -- หมายเหตุและข้อมูลเพิ่มเติม
    QualityRemark nvarchar(MAX),         -- หมายเหตุคุณภาพ
    Notes nvarchar(1000),                -- หมายเหตุทั่วไป
    
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

-- สร้าง Index สำหรับ Query ที่ใช้บ่อย
CREATE INDEX IX_ProductionSessions_PlanID ON ProductionSessions(PlanID);
CREATE INDEX IX_ProductionSessions_CreatedAt ON ProductionSessions(CreatedAt);

-- เพิ่ม Computed Column สำหรับ SessionGoodQuantity (คำนวณอัตโนมัติ)
ALTER TABLE ProductionSessions 
ADD SessionGoodQuantity AS (SessionQuantity - SessionRejectQuantity) PERSISTED;

PRINT '✅ ตาราง ProductionSessions สร้างเสร็จแล้ว (แบบง่าย)';

-- แสดงโครงสร้างตาราง
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ProductionSessions'
ORDER BY ORDINAL_POSITION;
