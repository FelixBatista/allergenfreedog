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
('oats', '["oatmeal","oat groats"]', '["possible"]', 'Cereal; may have gluten cross-contact', 'warn'),
('rice', '["brown rice","white rice","brewers rice","rice flour"]', '[]', 'Grain carbohydrate', 'safe'),
('corn gluten meal', '["maize gluten","corn protein"]', '["possible"]', 'Protein from corn/maize', 'warn'),
('chicken by-product meal', '[]', '["danger"]', 'Rendered poultry parts', 'danger'),
('poultry by-product meal', '[]', '["danger"]', 'Rendered poultry parts', 'danger'),
('chicken fat', '[]', '["danger"]', 'Poultry fat (trace proteins possible)', 'danger'),
('canola oil', '["rapeseed oil"]', '[]', 'Plant oil', 'safe'),
('sunflower oil', '[]', '[]', 'Plant oil', 'safe'),
('vegetable oil', '[]', '["possible"]', 'Unspecified plant oil', 'warn'),
('natural flavor', '["natural flavours","chicken gravy"]', '["possible"]', 'Flavoring; source may vary', 'warn'),
('tomato pomace', '[]', '[]', 'Fibre source', 'safe'),
('sweet potato', '[]', '[]', 'Carbohydrate', 'safe'),
('potato', '["potato starch","dried potato pulp"]', '[]', 'Carbohydrate', 'safe'),
('lentils', '["red lentils","green lentils","lentil fibre"]', '["possible"]', 'Legume', 'warn'),
('chickpeas', '["garbanzo beans"]', '["possible"]', 'Legume', 'warn'),
('alfalfa', '["alfalfa meal","alfalfa nutrient concentrate"]', '[]', 'Herbaceous plant', 'safe'),
('dl-methionine', '[]', '[]', 'Amino acid supplement', 'safe'),
('taurine', '[]', '[]', 'Amino sulfonic acid', 'safe'),
('chondroitin', '["chondroitin sulfate"]', '[]', 'Joint support', 'safe'),
('msm', '["methylsulfonylmethane"]', '[]', 'Joint support', 'safe'),
('l-carnitine', '[]', '[]', 'Metabolic support', 'safe'),
('kelp', '["seaweed","dried kelp"]', '[]', 'Mineral-rich algae', 'safe'),
('rosemary extract', '[]', '[]', 'Natural preservative', 'safe'),
('mixed tocopherols', '["tocopherols"]', '[]', 'Vitamin E preservative', 'safe'),
('yucca schidigera', '[]', '[]', 'Digestive/odor aid', 'safe'),
('inulin', '["chicory root","dried chicory root"]', '[]', 'Prebiotic fibre', 'safe'),
('mannan-oligosaccharides', '["MOS"]', '[]', 'Prebiotic', 'safe'),
('probiotics', '["bacillus subtilis","lactobacillus acidophilus","enterococcus faecium","bifidobacterium animalis","lactobacillus plantarum"]', '[]', 'Live microbes', 'safe'),
('bison', '[]', '[]', 'Novel red meat', 'safe'),
('venison', '[]', '[]', 'Novel red meat', 'safe'),
('beef', '["beef fat"]', '["possible"]', 'Red meat protein', 'warn'),
('lamb', '[]', '["possible"]', 'Red meat protein', 'warn'),
('turkey', '[]', '["danger"]', 'Poultry', 'danger'),
('duck', '[]', '["danger"]', 'Poultry', 'danger'),
('mackerel', '[]', '["possible"]', 'Fish', 'warn'),
('sardine', '[]', '["possible"]', 'Fish', 'warn'),
('herring', '["herring oil"]', '["possible"]', 'Fish', 'warn'),
('egg', '["egg product","dried egg","dried egg whites"]', '[]', 'Egg protein', 'safe'),
('spelt', '["hulled wheat"]', '["gluten"]', 'Ancient wheat', 'danger'),
('sorghum', '["grain sorghum","ground whole grain sorghum"]', '[]', 'Cereal', 'safe'),
('cranberry', '[]', '[]', 'Fruit; urinary support', 'safe'),
('blueberry', '[]', '[]', 'Fruit; antioxidants', 'safe'),
('raspberry', '[]', '[]', 'Fruit; antioxidants', 'safe'),
('pumpkin', '[]', '[]', 'Fibre/veg', 'safe'),
('garlic', '["garlic powder"]', '["danger"]', 'Avoid for sensitive dogs', 'danger');

-- Insert sample food catalog
INSERT INTO food_catalog (name, brand, ingredients, is_sample) VALUES
('Insect & Pea', 'BRIT', 'dehydrated insect, yellow peas, dried apple pulp, coconut oil, pea protein, linseed, calcium carbonate, dried algae (schizochytrium), pea flour, hydrolyzed yeasts, yeast extract, beta-glucans, dried sea buckthorn, fructo-oligosaccharides, mojave yucca, lactobacillus helveticus, minerals', TRUE),
('Poultry Senior Large Breed', 'BRIT', 'dehydrated poultry proteins, animal fats, maize, wheat meal, wheat flour, barley, maize gluten, wheat gluten, hydrolysed animal proteins, beet pulp, minerals, fish oil, soya oil, yeast products, psyllium husks and seeds, fructo-oligosaccharides, algal oil (schizochytrium), glucosamine, hydrolysed cartilage', TRUE),
('Salmon & Pea', 'BRIT', 'dehydrated salmon, yellow peas, hydrolysed salmon protein, buckwheat, coconut oil, apple pulp, salmon oil, hydrolysed salmon gravy, minerals, dried algae (ascophyllum), yeast extract, beta-glucans, dried sea buckthorn, fructo-oligosaccharides, mojave yucca', TRUE);
('Medium Adult', 'Royal Canin', 'brewers rice, brown rice, oats, chicken by-product meal, wheat gluten, chicken fat, corn gluten meal, natural flavor, beet pulp, fish oil, vegetable oil, fructo-oligosaccharides, minerals', FALSE),
('Adult Chicken & Barley Recipe', 'Hill''s Science Diet', 'chicken, brown rice, oats, maize, egg, pea, pea protein, natural flavor, corn gluten meal, linseed, chicken fat, beet pulp, minerals', FALSE),
('Complete Essentials Shredded Blend Chicken & Rice', 'Purina Pro Plan', 'chicken, rice, whole wheat, poultry by-product meal, whole corn, soybean meal, beef fat (mixed tocopherols), corn gluten meal, natural flavor, dried egg product, minerals, probiotics', FALSE),
('Original', 'Orijen', 'fresh chicken, fresh turkey, fresh eggs, fresh chicken liver, whole herring, whole flounder, turkey liver, chicken necks, chicken heart, turkey heart, dehydrated chicken, dehydrated turkey, dehydrated mackerel, dehydrated sardine, dehydrated herring, red lentils, green lentils, green peas, lentil fibre, chickpeas, yellow peas, pinto beans, navy beans, herring oil, chicken fat, chicken cartilage, freeze-dried chicken liver, freeze-dried turkey liver, pumpkin, butternut squash, zucchini, parsnips, carrots, apples, pears, kale, spinach, beet greens, turnip greens, kelp, cranberries, blueberries, saskatoon berries, chicory root, turmeric, milk thistle, burdock root, lavender, marshmallow root, rosehips, minerals', FALSE),
('High Prairie (Bison & Venison)', 'Taste of the Wild', 'water buffalo, lamb meal, chicken meal, sweet potato, pea, pea flour, chicken fat (mixed tocopherols), egg, roasted bison, roasted venison, beef, natural flavor, tomato pomace, fish meal, salt, choline chloride, taurine, dried chicory root, tomatoes, blueberries, raspberries, yucca schidigera, probiotics, minerals', FALSE),
('Life Protection Adult Chicken & Brown Rice', 'Blue Buffalo', 'deboned chicken, chicken meal, brown rice, oatmeal, barley, pea, chicken fat (mixed tocopherols), dried tomato pomace, natural flavor, pea protein, linseed, salt, alfalfa, pea fiber, calcium carbonate, potassium chloride, DL-methionine, carrots, blueberries, cranberries, kelp, parsley, turmeric, yeast, glucosamine, taurine, L-carnitine, vitamins and minerals', FALSE),
('Adult Dog Recipe', 'Acana', 'fresh chicken, chicken meal, red lentils, green peas, chickpeas, chicken giblets, turkey meal, chicken fat, eggs, raw hake, lentil fibre, pea starch, fish oil, green lentils, yellow peas, herring meal, raw turkey liver, salt, dried kelp, apples, butternut squash, carrots, pears, pumpkin, zucchini, chicory root, beet greens, kale, spinach, turnip greens, blueberries, cranberries, saskatoon berries, turmeric, milk thistle, burdock root, lavender, marshmallow root, rosehips, minerals', FALSE),
('Grain Free Real Texas Beef + Sweet Potato', 'Merrick', 'beef, lamb meal, sweet potato, pea, lentil, pea flour, canola oil (mixed tocopherols), tomato pomace, fish meal, natural flavor, minerals, vitamins', FALSE),
('Complete Health Adult Deboned Chicken & Oatmeal', 'Wellness', 'deboned chicken, chicken meal, oatmeal, barley, brown rice, pea, beet pulp, chicken fat, linseed, natural flavor, chicory root, taurine, spinach, broccoli, carrots, parsley, apples, blueberries, kale, mixed tocopherols, glucosamine, yucca schidigera, probiotics, minerals', FALSE),
('N&D Ancestral Grain Chicken & Pomegranate (Adult Med/Maxi)', 'Farmina', 'chicken, dehydrated chicken, whole spelt, whole oats, chicken fat, dried egg, herring, dehydrated herring, beet pulp, herring oil, dried carrot, dried pomegranate, inulin, FOS, yeast extract, rosemary extract, mixed tocopherols, minerals', FALSE),
('Adult Large Breed Lamb 1st Ingredient', 'Eukanuba', 'lamb, brewers rice, chicken by-product meal, wheat, corn, lamb meal, ground sorghum, chicken fat, natural flavor, beet pulp, egg, fish oil, pea fiber, minerals', FALSE),
('ProActive Health Minichunks Chicken & Whole Grains', 'Iams', 'chicken, ground whole grain corn, ground whole grain sorghum, chicken by-product meal, beet pulp, natural flavor, chicken fat (mixed tocopherols), dried egg, linseed, caramel color, potassium chloride, carrots, fructo-oligosaccharides, choline chloride, vitamins and minerals', FALSE),
('Complete Nutrition Grilled Steak & Vegetable', 'Pedigree', 'ground whole grain corn, meat and bone meal, corn gluten meal, animal fat (BHA, citric acid), soybean meal, natural flavor, beet pulp, vegetable oil, minerals, vitamins', FALSE),
('Adult', 'Magnussons', 'fresh beef and pork (44%), whole wheat flour, barley meal, fresh eggs, cold-pressed rapeseed oil, fresh carrots, dried potato pulp, minerals', FALSE),
('Fresh Norwegian Salmon (Grain-Free)', 'Edgard & Cooper', 'fresh salmon, potato, pea, pea protein, linseed, fish oil, vegetarian gravy, minerals, botanical herbs (marigold, nettle, blackberry leaves, fennel, caraway, chamomile, balm), MOS, FOS, beetroot, apples, mango, avocado, coconut, spinach, blackcurrants', FALSE),
('Chicken & Duck (Grain-Free)', 'Lily''s Kitchen', 'fresh chicken, freshly prepared duck, chicken liver, sweet potato, whole peas, whole lentils, pea protein, salmon oil, linseed, dried carrot, apple, spinach, seaweed, prebiotics, botanicals, glucosamine, chondroitin, vitamins and minerals', FALSE),
('Free-Range Chicken', 'Canagan', 'freshly prepared free-range chicken, dried chicken, sweet potato, pea, potato, chicken fat, alfalfa, dried egg, chicken gravy, salmon oil, minerals, glucosamine, MSM, apple, carrot, spinach, psyllium, seaweed, fructo-oligosaccharides, chondroitin, camomile, peppermint, marigold, cranberry, aniseed, fenugreek', FALSE),
('Adult Chicken & Rice', 'Harringtons', 'chicken and meat meals, rice, maize, barley, poultry fat, poultry gravy, beet pulp, linseed, minerals, seaweed, FOS, yucca schidigera', FALSE),
('Pacific Stream (Smoked Salmon)', 'Taste of the Wild', 'salmon, ocean fish meal, sweet potato, potato, pea, canola oil (mixed tocopherols), lentils, salmon meal, smoke-flavored salmon, tomato pomace, natural flavor, salt, DL-methionine, choline chloride, taurine, dried chicory root, tomatoes, blueberries, raspberries, yucca schidigera, probiotics, minerals', FALSE),
('Grain-Free Adult Salmon & Potato', 'Brit Care', 'dried salmon, potato, salmon protein, chicken fat (mixed tocopherols), dried apple, natural flavor, salmon oil, brewer''s yeast, glucosamine, chondroitin, MOS, herbs and fruits, FOS, yucca schidigera, inulin, milk thistle, minerals', FALSE);

-- Create indexes for better performance
CREATE INDEX idx_dog_profile_id ON triggering_foods(dog_profile_id);
CREATE INDEX idx_dog_profile_id_safe ON safe_foods(dog_profile_id);
CREATE INDEX idx_ingredient_name ON ingredient_master(name);
CREATE INDEX idx_food_catalog_name ON food_catalog(name);
CREATE INDEX idx_users_email ON users(email); 