CREATE DATABASE medicine_box;

USE medicine_box;

CREATE TABLE medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    stock INT,
    expiry_date DATE,
    alert_time TIME
);

INSERT INTO medicines (name, stock, expiry_date, alert_time) VALUES
('Aspirin', 50, '2025-12-31', '08:00:00'),
('Paracetamol', 30, '2024-06-15', '10:00:00'),
('Ibuprofen', 40, '2024-07-30', '15:00:00');

CREATE TABLE medicine_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_id INT,
    patient_id INT,
    intake_time DATETIME,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id)
);

SELECT * FROM medicines;

UPDATE medicines SET stock = stock - 1 WHERE id = 1;
