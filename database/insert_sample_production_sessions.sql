-- สร้างข้อมูลตัวอย่างสำหรับทดสอบระบบ
USE pes_db;

-- สร้างตาราง ProductionSessions ก่อน (ถ้ายังไม่มี)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ProductionSessions' AND TABLE_SCHEMA = 'pes_db')
BEGIN
    CREATE TABLE ProductionSessions (
        SessionID int IDENTITY(1,1) PRIMARY KEY,
        PlanID int NOT NULL,
        SessionNumber int NOT NULL,
        ActualStartDateTime datetime2 NOT NULL,
        ActualEndDateTime datetime2 NOT NULL,
        SessionQuantity int NOT NULL,
        SessionRejectQuantity int DEFAULT 0,
        SessionReworkQuantity int DEFAULT 0,
        BreakMorningMinutes int DEFAULT 0,
        BreakLunchMinutes int DEFAULT 0,
        BreakEveningMinutes int DEFAULT 0,
        SetupMinutes int DEFAULT 0,
        DowntimeMinutes int DEFAULT 0,
        DowntimeReason nvarchar(500),
        QualityRemark nvarchar(MAX),
        Notes nvarchar(1000),
        CreatedAt datetime2 DEFAULT GETDATE(),
        CreatedBy nvarchar(100) DEFAULT 'User',
        CONSTRAINT FK_ProductionSessions_PlanID
            FOREIGN KEY (PlanID) REFERENCES ProductionPlans(PlanID)
            ON DELETE CASCADE,
        CONSTRAINT UQ_ProductionSessions_PlanSession
            UNIQUE (PlanID, SessionNumber)
    );
    
    CREATE INDEX IX_ProductionSessions_PlanID ON ProductionSessions(PlanID);
    CREATE INDEX IX_ProductionSessions_CreatedAt ON ProductionSessions(CreatedAt);
    
    ALTER TABLE ProductionSessions
    ADD SessionGoodQuantity AS (SessionQuantity - SessionRejectQuantity) PERSISTED;
END

-- ข้อมูลตัวอย่าง Production Sessions สำหรับ Plan ID 1
INSERT INTO ProductionSessions (
    PlanID, SessionNumber, ActualStartDateTime, ActualEndDateTime,
    SessionQuantity, SessionRejectQuantity, SessionReworkQuantity,
    BreakLunchMinutes, QualityRemark, Notes, CreatedBy
) VALUES
-- Session 1
(1, 1, '2025-08-21 08:00:00', '2025-08-21 10:30:00', 150, 5, 2, 60, 'คุณภาพดี เริ่มงานใหม่', 'Session แรกของวัน', 'TestUser'),

-- Session 2
(1, 2, '2025-08-21 11:30:00', '2025-08-21 14:00:00', 180, 3, 1, 60, 'พบปัญหาเล็กน้อยแต่แก้ไขได้', 'Session หลังพัก', 'TestUser'),

-- Session 3
(1, 3, '2025-08-21 15:00:00', '2025-08-21 17:30:00', 120, 8, 5, 30, 'มีปัญหาเครื่องจักร', 'เครื่องขัดข้องบ่างๆ', 'TestUser');

-- ข้อมูลตัวอย่างสำหรับ Plan ID 2 (ยังไม่เสร็จ)
INSERT INTO ProductionSessions (
    PlanID, SessionNumber, ActualStartDateTime, ActualEndDateTime,
    SessionQuantity, SessionRejectQuantity, SessionReworkQuantity,
    BreakLunchMinutes, QualityRemark, Notes, CreatedBy
) VALUES
-- Session 1 ของ Plan 2
(2, 1, '2025-08-21 09:00:00', '2025-08-21 12:00:00', 200, 10, 0, 60, 'เริ่มต้นดี', 'Session แรก Plan 2', 'TestUser');

-- ตรวจสอบข้อมูลที่เพิ่ม
SELECT 
    ps.SessionID,
    ps.PlanID,
    ps.SessionNumber,
    ps.SessionQuantity,
    ps.SessionRejectQuantity,
    ps.SessionReworkQuantity,
    ps.SessionGoodQuantity,
    ps.QualityRemark,
    ps.CreatedAt
FROM ProductionSessions ps
ORDER BY ps.PlanID, ps.SessionNumber;

PRINT '✅ สร้างข้อมูลตัวอย่าง Production Sessions เรียบร้อย';

-- แสดงสรุปข้อมูล
SELECT 
    PlanID,
    COUNT(*) as TotalSessions,
    SUM(SessionQuantity) as TotalProduced,
    SUM(SessionRejectQuantity) as TotalRejects,
    SUM(SessionReworkQuantity) as TotalRework,
    SUM(SessionGoodQuantity) as TotalGoodQuantity
FROM ProductionSessions
GROUP BY PlanID
ORDER BY PlanID;
