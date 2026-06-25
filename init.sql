-- =========================
-- TABLE DES MAISONS
-- =========================
CREATE TABLE House (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- =========================
-- POINTS ACTUELS DES MAISONS
-- =========================
CREATE TABLE HousePoints (
    house_id INT PRIMARY KEY,
    points INT DEFAULT 0,
    FOREIGN KEY (house_id) REFERENCES House(id)
);

-- =========================
-- HISTORIQUE DES POINTS
-- =========================
CREATE TABLE PointLog (
    id INT PRIMARY KEY AUTO_INCREMENT,
    house_id INT NOT NULL,
    points INT NOT NULL,
    profs_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (house_id) REFERENCES House(id)
);