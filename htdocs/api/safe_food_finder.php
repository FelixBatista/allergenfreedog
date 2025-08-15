<?php
/**
 * Safe Food Finder API
 * Tests new foods against known problematic ingredients
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['foodName']) || !isset($input['ingredients']) || !isset($input['nonSimilarIngredients'])) {
        throw new Exception('Food name, ingredients, and non-similar ingredients are required');
    }
    
    if (empty($input['ingredients']) || empty($input['nonSimilarIngredients'])) {
        throw new Exception('Ingredients and non-similar ingredients cannot be empty');
    }
    
    $db = new Database();
    
    // Get ingredient master list for normalization
    $sql = "SELECT name, aliases FROM ingredient_master";
    $masterIngredients = $db->fetchAll($sql);
    
    // Normalize the new food ingredients
    $ingredients = array_map('trim', explode(',', $input['ingredients']));
    $ingredients = array_filter($ingredients);
    
    $normalizedIngredients = [];
    foreach ($ingredients as $ingredient) {
        $normalizedIngredients[] = normalizeIngredient($ingredient, $masterIngredients);
    }
    
    // Check for matches with non-similar ingredients
    $problematicIngredients = array_intersect($normalizedIngredients, $input['nonSimilarIngredients']);
    
    // Build ingredient analysis table
    $ingredientAnalysis = buildIngredientAnalysis($normalizedIngredients, $input['nonSimilarIngredients'], $masterIngredients);
    
    $result = [
        'foodName' => $input['foodName'],
        'isSafe' => empty($problematicIngredients),
        'problematicIngredients' => array_values($problematicIngredients),
        'problematicCount' => count($problematicIngredients),
        'ingredientAnalysis' => $ingredientAnalysis,
        'summary' => [
            'totalIngredients' => count($normalizedIngredients),
            'safeIngredients' => count($normalizedIngredients) - count($problematicIngredients),
            'problematicIngredients' => count($problematicIngredients)
        ]
    ];
    
    echo json_encode([
        'success' => true,
        'data' => $result
    ]);
    
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

function buildIngredientAnalysis($normalizedIngredients, $nonSimilarIngredients, $masterIngredients) {
    $analysis = [];
    
    foreach ($normalizedIngredients as $ingredient) {
        $isNonSimilar = in_array($ingredient, $nonSimilarIngredients);
        $riskLevel = getIngredientRisk($ingredient, $masterIngredients);
        
        $analysis[] = [
            'ingredient' => $ingredient,
            'status' => $isNonSimilar ? 'Non-Similar' : 'Safe',
            'riskLevel' => $riskLevel,
            'similarTo' => $isNonSimilar ? 'Found in triggering foods' : '',
            'note' => getIngredientNote($ingredient, $masterIngredients)
        ];
    }
    
    return $analysis;
}

function getIngredientRisk($ingredient, $masterIngredients) {
    foreach ($masterIngredients as $m) {
        if ($m['name'] === $ingredient) {
            return $m['risk_level'];
        }
    }
    return 'safe';
}

function getIngredientNote($ingredient, $masterIngredients) {
    foreach ($masterIngredients as $m) {
        if ($m['name'] === $ingredient) {
            return $m['note'];
        }
    }
    return '';
}
?> 