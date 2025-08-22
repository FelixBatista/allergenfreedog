-- Database Schema for AllergenFreeDog
-- Run this file in your MySQL database to create the required tables

-- Users table for future user accounts
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Dog profiles table
CREATE TABLE IF NOT EXISTS dog_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    breed VARCHAR(100),
    age INT,
    weight DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Food catalog table
CREATE TABLE IF NOT EXISTS food_catalog (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    ingredients TEXT NOT NULL,
    is_sample BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Triggering foods table
CREATE TABLE IF NOT EXISTS triggering_foods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dog_profile_id INT NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    ingredients TEXT NOT NULL,
    symptoms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dog_profile_id) REFERENCES dog_profiles(id) ON DELETE CASCADE
);

-- Safe foods table
CREATE TABLE IF NOT EXISTS safe_foods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dog_profile_id INT NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    ingredients TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dog_profile_id) REFERENCES dog_profiles(id) ON DELETE CASCADE
);

-- Ingredient master list table
CREATE TABLE IF NOT EXISTS ingredient_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    aliases TEXT,
    tags JSON,
    note TEXT,
    risk_level ENUM('safe', 'low', 'warn', 'danger') DEFAULT 'safe',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Food comparison sessions table
CREATE TABLE IF NOT EXISTS comparison_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dog_profile_id INT,
    session_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dog_profile_id) REFERENCES dog_profiles(id) ON DELETE CASCADE
);

-- Insert sample data for ingredient master list
INSERT INTO ingredient_master (name, aliases, tags, note, risk_level) VALUES
('wheat', '["wheat gluten", "wheat meal", "wheat flour"]', '["gluten"]', 'Gluten cereal', 'danger'),
('wheat gluten', '[]', '["gluten"]', 'Gluten protein', 'danger'),
('barley', '[]', '["gluten"]', 'Gluten cereal', 'danger'),
('rye', '[]', '["gluten"]', 'Gluten cereal', 'danger'),
('maize', '["corn"]', '["possible"]', 'Some dogs sensitive', 'warn'),
('soya', '["soy"]', '["possible"]', 'Legume; known allergen for some', 'warn'),
('pea', '["yellow peas", "pea flour", "pea protein"]', '["possible"]', 'Legume protein', 'warn'),
('buckwheat', '[]', '["possible"]', 'Plant pseudo-grain', 'warn'),
('yeast', '["yeast extract", "hydrolyzed yeasts", "yeast products"]', '["possible"]', 'Can bother yeast‑sensitive dogs', 'warn'),
('salmon', '["salmon oil", "hydrolysed salmon protein", "hydrolysed salmon gravy"]', '["possible"]', 'Fish protein/fat', 'warn'),
('fish oil', '[]', '["possible"]', 'Fish source', 'warn'),
('poultry', '["dehydrated poultry proteins", "poultry digest", "poultry fat"]', '["danger"]', 'Chicken/turkey family', 'danger'),
('chicken', '[]', '["danger"]', 'Poultry', 'danger'),
('animal fat', '[]', '["possible"]', 'May carry trace proteins depending on refinement', 'warn'),
('glucosamine', '[]', '[]', 'Joint support', 'safe'),
('hydrolysed animal proteins', '[]', '["low"]', 'Hydrolysed — reduced allergenicity', 'low'),
('hydrolyzed', '[]', '["low"]', 'Hydrolysed marker', 'low'),
('insect', '[]', '[]', 'Novel protein', 'safe'),
('algae', '["schizochytrium", "ascophyllum"]', '[]', 'Omega‑3/trace', 'safe'),
('coconut oil', '[]', '[]', 'Fat source', 'safe'),
('linseed', '[]', '[]', 'Omega‑3 plant', 'safe'),
('lactobacillus', '[]', '[]', 'Probiotic', 'safe'),
('fructo-oligosaccharides', '[]', '[]', 'Prebiotic', 'safe'),
('beta-glucans', '[]', '[]', 'Immune/prebiotic', 'safe'),
('psyllium', '[]', '[]', 'Fibre', 'safe'),
('beet pulp', '[]', '[]', 'Fibre', 'safe'),
('apple pulp', '[]', '[]', 'Fibre', 'safe'),
('minerals', '[]', '[]', 'Trace elements', 'safe');

-- Insert sample food catalog
INSERT INTO food_catalog (name, brand, ingredients, is_sample) VALUES
('Insect & Pea', 'Sample Brand', 'dehydrated insect, yellow peas, dried apple pulp, coconut oil, pea protein, linseed, calcium carbonate, dried algae (schizochytrium), pea flour, hydrolyzed yeasts, yeast extract, beta-glucans, dried sea buckthorn, fructo-oligosaccharides, mojave yucca, lactobacillus helveticus, minerals', TRUE),
('Poultry Senior Large Breed', 'Sample Brand', 'dehydrated poultry proteins, animal fats, maize, wheat meal, wheat flour, barley, maize gluten, wheat gluten, hydrolysed animal proteins, beet pulp, minerals, fish oil, soya oil, yeast products, psyllium husks and seeds, fructo-oligosaccharides, algal oil (schizochytrium), glucosamine, hydrolysed cartilage', TRUE),
('Salmon & Pea', 'Sample Brand', 'dehydrated salmon, yellow peas, hydrolysed salmon protein, buckwheat, coconut oil, apple pulp, salmon oil, hydrolysed salmon gravy, minerals, dried algae (ascophyllum), yeast extract, beta-glucans, dried sea buckthorn, fructo-oligosaccharides, mojave yucca', TRUE);

-- Create indexes for better performance
CREATE INDEX idx_dog_profile_id ON triggering_foods(dog_profile_id);
CREATE INDEX idx_dog_profile_id_safe ON safe_foods(dog_profile_id);
CREATE INDEX idx_ingredient_name ON ingredient_master(name);
CREATE INDEX idx_food_catalog_name ON food_catalog(name);
CREATE INDEX idx_users_email ON users(email); 