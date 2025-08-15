<?php
/**
 * Food Catalog API
 * Handles food catalog operations
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $db = new Database();
    
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // Get food catalog
            $sql = "SELECT id, name, brand, ingredients, is_sample FROM food_catalog ORDER BY name";
            $foods = $db->fetchAll($sql);
            
            echo json_encode([
                'success' => true,
                'data' => $foods
            ]);
            break;
            
        case 'POST':
            // Add new food to catalog
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['name']) || !isset($input['ingredients'])) {
                throw new Exception('Name and ingredients are required');
            }
            
            $foodData = [
                'name' => trim($input['name']),
                'brand' => isset($input['brand']) ? trim($input['brand']) : '',
                'ingredients' => trim($input['ingredients']),
                'is_sample' => false
            ];
            
            $id = $db->insert('food_catalog', $foodData);
            
            echo json_encode([
                'success' => true,
                'message' => 'Food added successfully',
                'id' => $id
            ]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?> 