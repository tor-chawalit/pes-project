-- Insert sample product sizes
USE [PES]
GO

-- Clear existing data (optional, for testing)
-- DELETE FROM ProductSizes;

-- Insert common beverage sizes
INSERT INTO ProductSizes (SizeValue, SizeUnit, SizeDisplay, sort_order, IsActive)
VALUES 
    ('250', 'ml', '250ml', 1, 1),
    ('330', 'ml', '330ml', 2, 1),
    ('500', 'ml', '500ml', 3, 1),
    ('750', 'ml', '750ml', 4, 1),
    ('1', 'L', '1L', 5, 1),
    ('1.5', 'L', '1.5L', 6, 1),
    ('2', 'L', '2L', 7, 1),
    ('5', 'L', '5L', 8, 1),
    ('10', 'L', '10L', 9, 1),
    ('20', 'L', '20L', 10, 1);

-- Verify data
SELECT * FROM ProductSizes ORDER BY sort_order;
