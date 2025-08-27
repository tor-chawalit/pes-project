-- เพิ่ม WorkingMinutes column ให้ตาราง ProductionSessions
-- ===============================================================
-- สำหรับเก็บเวลาทำงานสุทธิที่หักแล้ว (Break Time + Downtime)
-- ===============================================================

USE PES_MAIN;
GO

-- เพิ่ม WorkingMinutes column
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'ProductionSessions' 
               AND COLUMN_NAME = 'WorkingMinutes')
BEGIN
    ALTER TABLE ProductionSessions 
    ADD WorkingMinutes INT DEFAULT 0;
    
    PRINT 'WorkingMinutes column added to ProductionSessions table';
END
ELSE
BEGIN
    PRINT 'WorkingMinutes column already exists in ProductionSessions table';
END;
GO

-- อัปเดตข้อมูลที่มีอยู่ (คำนวณ WorkingMinutes จากข้อมูลเดิม)
UPDATE ProductionSessions 
SET WorkingMinutes = CASE 
    WHEN ActualStartDateTime IS NOT NULL AND ActualEndDateTime IS NOT NULL 
    THEN GREATEST(0, 
        DATEDIFF(MINUTE, ActualStartDateTime, ActualEndDateTime) 
        - ISNULL(BreakMorningMinutes, 0) 
        - ISNULL(BreakLunchMinutes, 0) 
        - ISNULL(BreakEveningMinutes, 0)
        - ISNULL(DowntimeMinutes, 0)
    )
    ELSE 0 
END
WHERE WorkingMinutes = 0 
  AND ActualStartDateTime IS NOT NULL 
  AND ActualEndDateTime IS NOT NULL;

PRINT 'Updated existing WorkingMinutes values';
GO

-- เพิ่ม comment สำหรับ column
EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'เวลาทำงานสุทธิที่หักเวลาพักและ Downtime แล้ว (นาที)', 
    @level0type=N'SCHEMA', @level0name=N'dbo', 
    @level1type=N'TABLE', @level1name=N'ProductionSessions', 
    @level2type=N'COLUMN', @level2name=N'WorkingMinutes';
GO

PRINT 'WorkingMinutes setup completed successfully!';
