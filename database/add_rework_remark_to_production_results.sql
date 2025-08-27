-- เพิ่ม columns สำหรับ Rework และ Remark ใน ProductionResults table
-- เพื่อให้สามารถบันทึกข้อมูล rework และหมายเหตุคุณภาพในการยืนยันจบงานได้

-- เพิ่ม column สำหรับจำนวน Rework
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'ProductionResults') AND name = 'ReworkPieces')
BEGIN
    ALTER TABLE ProductionResults
    ADD ReworkPieces INT NULL DEFAULT 0
END

-- เพิ่ม column สำหรับหมายเหตุคุณภาพ
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'ProductionResults') AND name = 'QualityRemark')
BEGIN
    ALTER TABLE ProductionResults
    ADD QualityRemark NVARCHAR(MAX) NULL
END

-- อัปเดตข้อมูลเก่าให้มีค่าเริ่มต้น
UPDATE ProductionResults 
SET ReworkPieces = 0 
WHERE ReworkPieces IS NULL

PRINT 'เพิ่ม columns ReworkPieces และ QualityRemark ใน ProductionResults เรียบร้อยแล้ว'

-- ตรวจสอบ structure หลังการเปลี่ยนแปลง
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ProductionResults'
    AND COLUMN_NAME IN ('ReworkPieces', 'QualityRemark')
ORDER BY COLUMN_NAME
