USE elderly_care_agent;

INSERT IGNORE INTO elderly (id, name, age, gender, id_card, phone, address, emergency_contact, emergency_phone, health_status, risk_level, is_alone, grid_member_id)
VALUES (
    101, 
    'Zhang San', 
    75, 
    'male', 
    '110101194901011234', 
    '13800138000', 
    '北京市朝阳区', 
    'Li Si', 
    '13800138001', 
    'fair', 
    'high', 
    true, 
    1
);

SELECT id, name, age, gender FROM elderly LIMIT 5;