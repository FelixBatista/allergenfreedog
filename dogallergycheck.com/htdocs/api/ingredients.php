<?php
/**
 * Ingredients API
 * Handles ingredient operations and normalization
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
            // Get ingredient master list
            $sql = "SELECT name, aliases, tags, note, risk_level FROM ingredient_master ORDER BY name";
            $ingredients = $db->fetchAll($sql);
            
            // Process JSON fields
            foreach ($ingredients as &$ingredient) {
                $ingredient['aliases'] = json_decode($ingredient['aliases'], true) ?: [];
                $ingredient['tags'] = json_decode($ingredient['tags'], true) ?: [];
            }
            
            echo json_encode([
                'success' => true,
                'data' => $ingredients
            ]);
            break;
            
        case 'POST':
            // Normalize ingredient names
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['ingredients']) || !is_array($input['ingredients'])) {
                throw new Exception('Ingredients array is required');
            }
            
            $normalized = [];
            $sql = "SELECT name, aliases FROM ingredient_master";
            $masterIngredients = $db->fetchAll($sql);
            
            foreach ($input['ingredients'] as $ingredient) {
                $normalized[] = normalizeIngredient($ingredient, $masterIngredients);
            }
            
            echo json_encode([
                'success' => true,
                'data' => $normalized
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

function normalizeIngredient($raw, $masterIngredients) {
    $s = strtolower(trim($raw));
    
    // Remove %, parentheses content, and extra spaces
    $s = preg_replace('/\(.*?\)/', '', $s);
    $s = preg_replace('/\d+%/', '', $s);
    $s = preg_replace('/\s+/', ' ', $s);
    $s = trim($s);
    
    // Try alias mapping
    foreach ($masterIngredients as $m) {
        $aliases = json_decode($m['aliases'], true) ?: [];
        $terms = array_merge([$m['name']], $aliases);
        
        foreach ($terms as $term) {
            if (strpos($s, $term) !== false) {
                return $m['name'];
            }
        }
    }
    
    return $s;
}
?> 