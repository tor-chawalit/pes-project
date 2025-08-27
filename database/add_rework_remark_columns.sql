-- เพิ่ม columns สำหรับ Rework และ Remark ใน PartialProductionConfirmations table
-- เพื่อให้สามารถบันทึกข้อมูล rework และหมายเหตุคุณภาพได้

-- เพิ่ม column สำหรับจำนวน Rework
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'PartialProductionConfirmations') AND name = 'SessionReworkQuantity')
BEGIN
    ALTER TABLE PartialProductionConfirmations
    ADD SessionReworkQuantity INT NULL DEFAULT 0
END

-- เพิ่ม column สำหรับหมายเหตุคุณภาพ
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'PartialProductionConfirmations') AND name = 'QualityRemark')
BEGIN
    ALTER TABLE PartialProductionConfirmations
    ADD QualityRemark NVARCHAR(MAX) NULL
END

-- อัปเดตข้อมูลเก่าให้มีค่าเริ่มต้น
UPDATE PartialProductionConfirmations 
SET SessionReworkQuantity = 0 
WHERE SessionReworkQuantity IS NULL

PRINT 'เพิ่ม columns SessionReworkQuantity และ QualityRemark เรียบร้อยแล้ว'

-- ตรวจสอบ structure หลังการเปลี่ยนแปลง
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'PartialProductionConfirmations'
    AND COLUMN_NAME IN ('SessionReworkQuantity', 'QualityRemark')
ORDER BY COLUMN_NAME
